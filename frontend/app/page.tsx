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
  LogIn,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-blue-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <div className="bg-green-600 p-2 rounded-xl mr-3">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Farm2Home</h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <Link
                href="/store"
                className="text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                Products
              </Link>
              <a
                href="#about"
                className="text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                About
              </a>
              <a
                href="#contact"
                className="text-gray-700 hover:text-green-600 transition-colors font-medium"
              >
                Contact
              </a>
            </nav>
            <div className="flex items-center space-x-2">
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/admin">Admin</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/farmer">Farmer</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/customer">Customer</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/agent">Agent</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href="/auth/signin/cr">CR</Link>
              </Button>
              <Button asChild className="bg-green-600 hover:bg-green-700">
                <Link href="/store">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Shop Now
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Fresh from
              <span className="text-green-600"> Farm</span>
              <br />
              to Your Door
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect directly with local farmers and get the freshest produce
              delivered to your home. Supporting sustainable agriculture while
              enjoying premium quality.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                asChild
                className="bg-green-600 hover:bg-green-700"
              >
                <Link href="/store">
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Start Shopping
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/role-selection">
                  <User className="h-5 w-5 mr-2" />
                  Sign Up
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/auth/signin">
                  <LogIn className="h-5 w-5 mr-2" />
                  Sign In
                </Link>
              </Button>
            </div>

            {/* Individual Role Buttons */}
            <div className="mt-8">
              <p className="text-lg text-gray-600 mb-4">Sign in directly as:</p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin/admin">Admin</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                  asChild
                >
                  <Link href="/auth/farmer">Farmer</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href="/auth/customer">Customer</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin/agent">Agent</Link>
                </Button>
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin/cr">CR</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Farm2Home?
            </h2>
            <p className="text-lg text-gray-600">
              Direct connection between farmers and consumers
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">Fresh & Organic</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Get the freshest produce directly from local farms, harvested
                  at peak ripeness for maximum nutrition and flavor.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Truck className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">Fast Delivery</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  Quick and reliable delivery service ensures your fresh produce
                  reaches you in perfect condition.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-8 w-8 text-purple-600" />
                </div>
                <CardTitle className="text-xl">Trusted Quality</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-gray-600">
                  All farmers are verified and products are quality-checked to
                  ensure you get the best every time.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Role Access Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Join Our Community
            </h2>
            <p className="text-lg text-gray-600">
              Choose your role and start your journey with Farm2Home
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Admin */}
            <Card className="border-red-200 bg-red-50 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-red-600 p-3 rounded-xl mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Admin
                </CardTitle>
                <p className="text-gray-600">
                  Platform management and oversight
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin/admin">Admin Access</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Farmer */}
            <Card className="border-green-200 bg-green-50 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-green-600 p-3 rounded-xl mx-auto mb-4">
                  <Leaf className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Farmer
                </CardTitle>
                <p className="text-gray-600">
                  Sell your fresh produce directly
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                  asChild
                >
                  <Link href="/auth/farmer">Farmer Access</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Customer */}
            <Card className="border-blue-200 bg-blue-50 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-blue-600 p-3 rounded-xl mx-auto mb-4">
                  <User className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Customer
                </CardTitle>
                <p className="text-gray-600">Browse and order fresh produce</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  asChild
                >
                  <Link href="/auth/customer">Customer Access</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Pickup Agent */}
            <Card className="border-orange-200 bg-orange-50 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-orange-600 p-3 rounded-xl mx-auto mb-4">
                  <Truck className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Pickup Agent
                </CardTitle>
                <p className="text-gray-600">Help with pickup and delivery</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin/agent">Agent Access</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Community Representative */}
            <Card className="border-purple-200 bg-purple-50 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-purple-600 p-3 rounded-xl mx-auto mb-4">
                  <Shield className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  Community Representative
                </CardTitle>
                <p className="text-gray-600">
                  Access to customer orders, delivery tracking, and
                  communication with customers and farmers
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm text-gray-600 space-y-1">
                  <p>• Monitor orders in your service areas</p>
                  <p>• Track delivery progress</p>
                  <p>• Communicate with customers & farmers</p>
                  <p>• Earn commissions from completed orders</p>
                </div>
                <Button
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin/cr">CR Access</Link>
                </Button>
              </CardContent>
            </Card>

            {/* General Access */}
            <Card className="border-gray-200 bg-gray-50 hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="text-center">
                <div className="bg-gray-600 p-3 rounded-xl mx-auto mb-4">
                  <LogIn className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-xl font-bold text-gray-900">
                  General Access
                </CardTitle>
                <p className="text-gray-600">
                  General login and role selection
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white"
                  asChild
                >
                  <Link href="/auth/signin">General Login</Link>
                </Button>
                <Button
                  className="w-full bg-white hover:bg-gray-50 text-gray-600 border border-gray-300"
                  variant="outline"
                  asChild
                >
                  <Link href="/auth/role-selection">Role Selection</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-green-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-green-100 mb-8">
            Join thousands of satisfied customers who trust Farm2Home for their
            fresh produce needs.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" asChild>
              <Link href="/store/products">
                <ShoppingCart className="h-5 w-5 mr-2" />
                Browse Products
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-600"
              asChild
            >
              <Link href="/auth/role-selection">
                <User className="h-5 w-5 mr-2" />
                Sign Up
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-green-600"
              asChild
            >
              <Link href="/auth/signin">
                <LogIn className="h-5 w-5 mr-2" />
                Sign In
              </Link>
            </Button>
          </div>

          {/* Individual Role Buttons */}
          <div className="mt-8">
            <p className="text-lg text-green-100 mb-4">Or access directly:</p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white"
                asChild
              >
                <Link href="/auth/signin/admin">Admin</Link>
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                asChild
              >
                <Link href="/auth/signin/farmer">Farmer</Link>
              </Button>
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                asChild
              >
                <Link href="/auth/signin/customer">Customer</Link>
              </Button>
              <Button
                size="sm"
                className="bg-orange-600 hover:bg-orange-700 text-white"
                asChild
              >
                <Link href="/auth/signin/agent">Agent</Link>
              </Button>
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
                asChild
              >
                <Link href="/auth/signin/cr">CR</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              About Farm2Home
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We&apos;re revolutionizing the way you get fresh produce by
              connecting you directly with local farmers.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Our Mission
              </h3>
              <p className="text-gray-600 mb-6">
                To bridge the gap between farmers and consumers, ensuring fresh,
                high-quality produce reaches your table while supporting local
                agriculture and sustainable farming practices.
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Why We Started
              </h3>
              <p className="text-gray-600">
                We believe that everyone deserves access to fresh, nutritious
                produce. By eliminating middlemen, we ensure farmers get fair
                prices while you get the freshest products at competitive rates.
              </p>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-2xl p-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    500+
                  </div>
                  <div className="text-sm text-gray-600">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    50+
                  </div>
                  <div className="text-sm text-gray-600">Partner Farmers</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    1000+
                  </div>
                  <div className="text-sm text-gray-600">Orders Delivered</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    4.9★
                  </div>
                  <div className="text-sm text-gray-600">Average Rating</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Get in Touch
            </h2>
            <p className="text-xl text-gray-600">
              Have questions? We&apos;re here to help!
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Contact Information
              </h3>
              <div className="space-y-6">
                <div className="flex items-center">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Email</h4>
                    <p className="text-gray-600">support@farm2home.com</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                    <Search className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">Phone</h4>
                    <p className="text-gray-600">+1 (555) 123-4567</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mr-4">
                    <Truck className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      Support Hours
                    </h4>
                    <p className="text-gray-600">24/7 Customer Support</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Send us a Message
              </h3>
              <form className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message
                  </label>
                  <textarea
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Your message..."
                  ></textarea>
                </div>
                <Button className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <div className="bg-green-600 p-2 rounded-xl mr-3">
                  <Leaf className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-bold">Farm2Home</h3>
              </div>
              <p className="text-gray-400">
                Connecting farmers directly with consumers for fresh,
                sustainable produce delivery.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/store/products"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Products
                  </Link>
                </li>
                <li>
                  <a
                    href="#about"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    About Us
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2">
                <li>
                  <Link
                    href="/auth/signup"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Sign Up
                  </Link>
                </li>
                <li>
                  <Link
                    href="/auth/signin"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Sign In
                  </Link>
                </li>
                <li>
                  <Link
                    href="/store"
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    Help
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>support@farm2home.com</li>
                <li>+1 (555) 123-4567</li>
                <li>Available 24/7</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Farm2Home. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
