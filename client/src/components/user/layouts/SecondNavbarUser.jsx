import { Link } from "react-router-dom";

const navItems = [
  { name: "Home", href: "/" },
  { name: "Shop", href: "/shop" },
  { name: "Categories", href: "/categories" },
  { name: "Brands", href: "/brands" },
  { name: "About", href: "/about" },
  { name: "Contact Us", href: "/contact" },
];

export const SecondNavbarUser = () => {
  return (
    <nav className="bg-black py-3 h-[75px] mt-20 flex items-center w-full">
      <div className="container mx-auto px-4">
        <ul className="flex justify-center space-x-8 font-rubik uppercase">
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="text-white hover:text-red-600 transition-colors"
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
};
