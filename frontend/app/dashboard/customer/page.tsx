import { redirect } from "next/navigation";

export default function CustomerDashboardPage() {
  // Redirect customers directly to the store products page
  redirect("/customer/store/products");
}
