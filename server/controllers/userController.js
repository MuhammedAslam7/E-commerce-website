import { Cart } from "../model/cart.js";
import { Product } from "../model/product.js";
import { Address } from "../model/addressSchema.js";
import User from "../model/userModel.js";
import bcryptjs from "bcryptjs";
import { Category } from "../model/category.js";
import { Brand } from "../model/brand.js";

export const userHome = async (req, res) => {
  try {
    const products = await Product.aggregate([
      { $match: { listed: true } },

      {
        $lookup: {
          from: "categories",
          localField: "category",
          foreignField: "_id",
          as: "categoryDetails",
        },
      },
      { $unwind: "$categoryDetails" },
      { $match: { "categoryDetails.listed": true } },

      {
        $lookup: {
          from: "brands",
          localField: "brand",
          foreignField: "_id",
          as: "brandDetails",
        },
      },
      { $unwind: "$brandDetails" },
      { $match: { "brandDetails.listed": true } },

      {
        $project: {
          productName: 1,
          description: 1,
          price: 1,
          discountedPrice: 1,
          thumbnailImage: 1,
          images: 1,
          createdAt: 1,
        },
      },

      { $sort: { createdAt: -1 } },

      { $limit: 8 },
    ]);
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

export const productPage = async (req, res) => {
  const {
    page = 1,
    limit = 6,
    minPrice,
    maxPrice,
    categories,
    brands,
  } = req.query;
  const skip = (page - 1) * limit;

  try {
    let query = { listed: true };

    if (minPrice && maxPrice) {
      query.price = { $gte: Number(minPrice), $lte: Number(maxPrice) };
    }

    if (categories) {
      const categoryIds = await Category.find({
        name: { $in: categories.split(",") },
        listed: true,
      }).distinct("_id");
      query.category = { $in: categoryIds };
    }

    if (brands) {
      const brandIds = await Brand.find({
        name: { $in: brands.split(",") },
        listed: true,
      }).distinct("_id");
      query.brand = { $in: brandIds };
    }

    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate({
        path: 'category',
        match: { listed: true },
        select: 'name',
      })
      .populate({
        path: 'brand',
        match: { listed: true },
        select: 'name', 
      });
      
      const allProducts = await Product.find()


    const totalProducts = await Product.countDocuments(query);
    const totalPage = Math.ceil(totalProducts / limit);
    const currentPage = Number(page);

    res.status(200).json({ products, totalPage, totalProducts, currentPage, allProducts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
//////////////////////////////////////////
export const addToCart = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    return res.status(404).json({ message: "User is not valid" });
  }

  const { productId, color } = req.body;
  console.log(productId, color);

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({ message: "Product Not Found" });
    }

    let variant = product.variants.find((v) => v.color === color);

    if (variant.stock === 0) {
      return res
        .status(409)
        .json({ message: "Selected color is out of stock" });
    }
    const variantId = variant._id;

    let cart = await Cart.findOne({ userId });

    if (!cart) {
      cart = await new Cart({
        userId,
        items: [{ productId, variantId, color }],
        totalPrice: product.price,
        totalDiscount : product.discountedPrice ? product.price - product.discountedPrice : 0
      });
    } else {
      let productExist = await cart.items.some(
        (item) =>
          item.productId.toString() === productId && item.color === color
      );
      if (productExist) {
        return res.status(409).json({
          message: "Item is already exist on the cart. Please check Your Cart",
        });
      }
      cart.items.push({ productId, variantId, color });

      cart.totalPrice += product.price;
      cart.totalDiscount += product.discountedPrice ? product.price - product.discountedPrice : 0
    }
    await cart.save();
    res.status(200).json({ message: "Product Added to Cart. Go to cart" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: error.message });
  }
};
/////////////////////////////////////////
export const cartItems = async (req, res) => {
  const { userId } = req?.query;

  try {
    const cart = await Cart.findOne({ userId })
      .populate(
        "items.productId")
      .exec();

    if (!cart) {
      return res.status(404).json({ message: "Cart not found for the user" });
    }

    const items = await cart.items.map((item) => {
      const product = item.productId;

      if (!product) return item;

      const variant = product.variants.find(
        (variant) => variant._id.toString() == item.variantId.toString()
      );
      return {
        productId: product._id,
        productName: product?.productName,
        description: product?.description,
        price: product?.price,
        discountedPrice: product?.discountedPrice,
        thumbnailImage: product?.thumbnailImage,
        color: item.color,
        quantity: item.quantity,
        variant: variant || {},
      };
    });

    res.status(200).json({
      cartId: cart._id,
      userId: cart.userId,
      items,
      totalPrice: cart.totalPrice,
      totalDiscount: cart.totalDiscount
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
    console.log(error);
  }
};
//////////////////////////////////////////////////////////
export const updateCartQuantity = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    return res.status(404).json({ message: "User in not valid" });
  }
  const { productId, variantId, newQuantity } = req.body;

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }

    const productInCart = await cart.items.find(
      (item) => item.productId.toString() == productId
    );
    if (!productInCart) {
      return res.status(404).json({ message: "Product not found in cart." });
    }
    const variantInCart = await cart.items.find(
      (item) => item.variantId.toString() == variantId
    );
    if (!variantInCart) {
      return res
        .status(404)
        .json({ message: "This products variant not found in cart." });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }

    const difference = newQuantity - variantInCart.quantity;
    cart.totalPrice += product.price * difference;
    cart.totalDiscount += product.discountedPrice ? (product.price - product.discountedPrice) * difference : 0

    variantInCart.quantity = newQuantity;

    await cart.save();
    res.status(200).json({ message: "Cart updated successfully.", cart });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};
///////////////////////////////////////////////////////////////////////

export const deleteCartItem = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    return res.status(404).json({ message: "User in not valid" });
  }
  const { productId, variantId } = req?.body;
  console.log(productId, variantId);

  try {
    const cart = await Cart.findOne({ userId });

    if (!cart) {
      return res.status(404).json({ message: "Cart not found." });
    }
    const itemIndex = cart.items.findIndex(
      (item) => item.variantId.toString() === variantId
    );
    if (itemIndex === -1) {
      return res.status(404).json({ message: "Product not found in cart." });
    }
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: "Product not found." });
    }
    const removedItem = cart.items[itemIndex];
    cart.totalPrice -= removedItem.quantity * product.price;
    cart.totalDiscount -= product?.discountedPrice ? (product.price - product.discountedPrice) * removedItem.quantity : 0

    cart.items.splice(itemIndex, 1);
    await cart.save();
    res.status(200).json({ message: "Product removed from cart.", cart });
  } catch (error) {
    res.status(500).json({ message: "Internal server error." });
  }
};
//////////////////////////////////////////////
export const addAddress = async (req, res) => {
  const { userId } = req?.user;
  const { fullName, email, phone, country, state, city, landMark, pincode } =
    req.body.newAddress;

  try {
    const requiredFields = [
      "fullName",
      "email",
      "phone",
      "country",
      "state",
      "city",
      "landMark",
      "pincode",
    ];

    for (const field of requiredFields) {
      if (!req.body.newAddress[field]) {
        return res
          .status(400)
          .json({ message: `Missing required field: ${field}` });
      }
    }
    const newAddress = new Address({
      userId,
      fullName,
      email,
      phone,
      country,
      state,
      city,
      landMark,
      pincode,
    });

    const savedAddress = await newAddress.save();

    res.status(200).json({
      message: "Address added successfully",
    });
  } catch (error) {
    console.log(error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
///////////////////////////////////////////////////////
export const getAddress = async (req, res) => {
  const { userId } = req.user;

  if (!userId) {
    return res.status(400).json({ message: "User is not valid" });
  }
  try {
    const addresses = await Address.find({userId}, '-userId -createdAt -updatedAt -__v');

    res.status(200).json({
      message: "Address fetched successfully",
      addresses: addresses || [],
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server Error" });
  }
};
////////////////////////////////////////////////////

export const updateAddress = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    return res.status(400).json({ message: "User is not valid" });
  }
  const { id, updatedData } = req.body;

  try {
    const updatedAddress = await Address.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          fullName: updatedData.fullName,
          email: updatedData.email,
          phone: updatedData.phone,
          country: updatedData.country,
          state: updatedData.state,
          city: updatedData.city,
          landMark: updatedData.landMark,
          pincode: updatedData.pincode,
        },
      },
      { new: true, runValidators: true }
    );

    if (!updatedAddress) {
      return res
        .status(404)
        .json({ message: "Address not found or invalid user" });
    }

    res.status(200).json({
      message: "Address updated successfully",
      updatedAddress,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
/////////////////////////////////////////////////////////

export const deleteAddress = async (req, res) => {
  const { userId } = req.user;
  const { id } = req.body;
  try {
    const deletedAddress = await Address.findByIdAndDelete({ _id: id, userId });

    if (!deletedAddress) {
      return res
        .status(404)
        .json({ message: "Address not found or invalid user" });
    }

    res.status(200).json({
      message: "Address deleted successfully",
      deletedAddress,
    });
  } catch (error) {
    res.status(500).json({ message: "Internal server error", error });
  }
};
///////////////////////////////////////////////////////
export const changePassword = async (req, res) => {
  const { userId } = req.user;

  const { password, newPassword } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const matchPassword = await bcryptjs.compare(password, user.password);

    if (!matchPassword) {
      return res.status(400).json({ message: "Current Password is Incorrect" });
    }

    const hashedPassword = await bcryptjs.hash(newPassword, 10);

    user.password = hashedPassword;

    await user.save();
    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
/////////////////////////////////////////////////////////////
export const profileDetails = async (req, res) => {
  const { userId } = req.user;
  if (!userId) {
    return res.status(400).json({ message: "User is not valid" });
  }
  try {
    const user = await User.findById(userId, "username email phone");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Internal Server Error" });
  }
};
////////////////////////////////////////////////////////
export const updateProfile = async (req, res) => {
  const { userId } = req.user;
  const { username, email, phone } = req.body;
  if (!userId) {
    return res.status(400).json({ message: "User is not valid" });
  }
  try {
    const updates = {};
    if (username) updates.username = username;
    if (email) updates.email = email;
    if (phone) updates.phone = phone;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Sever Error" });
  }
};
///////////////////////////////////////////////////////////
export const getBrandCategory = async (req, res) => {
  try {
    const category = await Category.find({}, { name: 1, _id: 0 });
    const brands = await Brand.find({}, { name: 1, _id: 0 });

    res.status(200).json({
      message: "Brands and catagories",
      categories: category.map((category) => category.name),
      brands: brands.map((brand) => brand.name),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
/////////////////////////////////////////////////////////
export const productsForSearch = async(req, res) => {
  try {
    const allProducts = await Product.find({listed: true})

    res.status(200).json({allProducts})
  } catch (error) {
    console.log(error)
    
  }
}
