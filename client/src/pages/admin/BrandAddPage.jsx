import { NavbarAdmin } from "@/components/admin/layouts/NavbarAdmin";
import { SidebarAdmin } from "@/components/admin/layouts/SidebarAdmin";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { useAddBrandsMutation } from "@/services/api/admin/adminApi";
import { ConfirmDialog } from "@/components/admin/modals/ConfirmDilalog";

import { useToaster } from "@/utils/Toaster";

export const BrandAddPage = () => {
  const toast = useToaster();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });
  const [addBrands, { isLoading }] = useAddBrandsMutation();
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setConfirmModalOpen(true);
  };

  const confirmSubmit = async () => {
    setConfirmModalOpen(false);

    try {
      await addBrands(formData).unwrap();
      console.log("added");
      toast("Success", "Brand added successfully!", "#22c55e");
      setFormData({ name: "", description: "" });
    } catch (error) {
      console.log(error?.message);
      toast("Error", "Failed to add Brand. Please try again.", "#ff0000");
    }
  };

  return (
    <div className={`flex h-screen ${isDarkMode ? "Dark" : ""}`}>
      <SidebarAdmin />
      <main className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900 transition-colors duration-300">
        <NavbarAdmin
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
          pageName="ADD BRANDS"
        />

        <div className="flex-1 overflow-auto p-4 ">
          <Card className="max-w-7xl mx-auto min-h-full">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center text-gray-800 dark:text-white">
                Add New Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label
                    htmlFor="brandName"
                    className="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    Category Name
                  </label>
                  <Input
                    id="brandName"
                    name="name"
                    placeholder="Enter brand name"
                    value={formData?.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="brandDescription"
                    className="text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    Description
                  </label>
                  <Textarea
                    id="brandDescription"
                    placeholder="Enter brand description"
                    name="description"
                    value={formData?.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border rounded-md dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    rows={4}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-300"
                  disabled={isLoading}
                >
                  {isLoading ? "Adding Brand" : "Add Brand"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <ConfirmDialog
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={confirmSubmit}
        title="Confirm Brand Addition"
        description="Are you sure you want to add this Brand"
      />
    </div>
  );
};