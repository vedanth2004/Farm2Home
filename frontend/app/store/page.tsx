import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Leaf,
  Truck,
  Shield,
  Star,
  ArrowRight,
  ShoppingCart,
  User,
  Search,
} from "lucide-react";
import PublicStoreHeader from "@/components/PublicStoreHeader";

export default function StorePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <PublicStoreHeader />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-green-700"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h2 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                Fresh from Farm to Your Door
              </h2>
              <p className="text-xl mb-8 text-green-100">
                Connect directly with local farmers for the freshest produce.
                Experience farm-fresh vegetables delivered to your doorstep.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-white text-green-600 hover:bg-gray-100 h-14 px-8 text-lg font-semibold"
                >
                  <Link href="/store/products" className="flex items-center">
                    Browse Products
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="border-white text-white hover:bg-white hover:text-green-600 h-14 px-8 text-lg font-semibold"
                >
                  <Link href="/auth/signin" className="flex items-center">
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/20 rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-white">100%</div>
                    <div className="text-green-100">Fresh</div>
                  </div>
                  <div className="bg-white/20 rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-white">24/7</div>
                    <div className="text-green-100">Support</div>
                  </div>
                  <div className="bg-white/20 rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-white">Fast</div>
                    <div className="text-green-100">Delivery</div>
                  </div>
                  <div className="bg-white/20 rounded-2xl p-6 text-center">
                    <div className="text-3xl font-bold text-white">5★</div>
                    <div className="text-green-100">Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-4xl font-bold text-gray-900 mb-4">
              Why Choose Farm2Home?
            </h3>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We&apos;re revolutionizing the way you get fresh produce by
              connecting you directly with local farmers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">
                  Fresh Produce
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 leading-relaxed">
                  Get the freshest fruits and vegetables directly from local
                  farms, ensuring maximum nutrition and taste in every bite.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">
                  Support Farmers
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 leading-relaxed">
                  Buy directly from farmers, ensuring they get fair prices for
                  their hard work and dedication to sustainable farming.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center pb-4">
                <div className="bg-orange-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-orange-600" />
                </div>
                <CardTitle className="text-xl text-gray-900">
                  Fast Delivery
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600 leading-relaxed">
                  Quick and reliable delivery to your doorstep with real-time
                  tracking and updates on your order status.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-4xl font-bold mb-2">500+</div>
              <div className="text-green-100">Happy Farmers</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">10K+</div>
              <div className="text-green-100">Orders Delivered</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">50+</div>
              <div className="text-green-100">Cities Covered</div>
            </div>
            <div>
              <div className="text-4xl font-bold mb-2">4.9★</div>
              <div className="text-green-100">Customer Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-4xl font-bold text-gray-900 mb-6">
            Ready to Get Started?
          </h3>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of customers who trust Farm2Home for their fresh
            produce needs. Start your journey to healthier eating today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-green-600 hover:bg-green-700 h-14 px-8 text-lg font-semibold"
            >
              <Link href="/auth/signin" className="flex items-center">
                Start Shopping Now
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-green-600 text-green-600 hover:bg-green-600 hover:text-white h-14 px-8 text-lg font-semibold"
            >
              <Link href="/store" className="flex items-center">
                Learn More
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-green-600 p-2 rounded-xl mr-3">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <h4 className="text-2xl font-bold">Farm2Home</h4>
              </div>
              <p className="text-gray-400 mb-4">
                Connecting farmers with customers for fresh, local produce. Your
                trusted partner in healthy living.
              </p>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Quick Links</h5>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/store/products"
                    className="hover:text-white transition-colors"
                  >
                    Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#about"
                    className="hover:text-white transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#contact"
                    className="hover:text-white transition-colors"
                  >
                    Contact
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#contact"
                    className="hover:text-white transition-colors"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">For Farmers</h5>
              <ul className="space-y-2 text-gray-400">
                <li>
                  <Link
                    href="/auth/signin"
                    className="hover:text-white transition-colors"
                  >
                    Join as Farmer
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="hover:text-white transition-colors"
                  >
                    Sell Products
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="hover:text-white transition-colors"
                  >
                    Earnings
                  </Link>
                </li>
                <li>
                  <Link
                    href="/#contact"
                    className="hover:text-white transition-colors"
                  >
                    Support
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h5 className="text-lg font-semibold mb-4">Contact Info</h5>
              <div className="space-y-2 text-gray-400">
                <p>📧 hello@farm2home.com</p>
                <p>📞 +91 98765 43210</p>
                <p>📍 Bangalore, India</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>
              © 2024 Farm2Home. All rights reserved. Made with ❤️ for farmers
              and customers.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
