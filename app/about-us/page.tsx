"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Store,
  Package,
  Globe,
  Code,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-accent/5 border-b">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            {/* Logo/Brand */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-black flex items-center justify-center shadow-2xl overflow-hidden">
                  <img 
                    src="/favicon.ico" 
                    alt="Seltro Logo" 
                    className="w-20 h-20 md:w-24 md:h-24 object-contain brightness-0 invert"
                  />
                </div>
              </div>
            </div>

            <h1 className="text-6xl md:text-8xl tracking-tight text-foreground" style={{ fontFamily: 'var(--font-allison)' }}>
              Seltro
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground font-light">
              Smart IT Solutions
            </p>
            <div className="h-1 w-24 bg-gradient-to-r from-primary to-primary/40 rounded-full mx-auto" />
          </div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <Card className="border-2">
            <CardHeader>
              <CardTitle className="text-3xl md:text-4xl text-center">
                Our Mission
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg md:text-xl text-center text-muted-foreground leading-relaxed">
                <span className="text-foreground font-semibold">
                  Powering Kanpur Digital Growth
                </span>
              </p>
              <p className="text-base md:text-lg text-center text-muted-foreground leading-relaxed">
                Serving clients & businesses in Kanpur. Supporting local
                businesses, restaurants, and shops with innovative technology
                solutions that drive growth and efficiency.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Solutions Section */}
      <div className="container mx-auto px-4 py-16 md:py-24 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Our Solutions
            </h2>
            <p className="text-muted-foreground text-lg">
              Comprehensive IT services tailored for your business
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* POS Systems */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Store className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl">POS Systems</h3>
                <p className="text-sm text-muted-foreground">
                  Modern point-of-sale solutions for retail and restaurants
                </p>
              </CardContent>
            </Card>

            {/* Inventory Management */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Package className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl">Inventory Management</h3>
                <p className="text-sm text-muted-foreground">
                  Smart inventory tracking and management systems
                </p>
              </CardContent>
            </Card>

            {/* Website Development */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Globe className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl">Website Development</h3>
                <p className="text-sm text-muted-foreground">
                  Professional websites that help your business grow online
                </p>
              </CardContent>
            </Card>

            {/* Business Software */}
            <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 hover:border-primary/50">
              <CardContent className="pt-6 text-center space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Code className="w-8 h-8 text-primary" />
                  </div>
                </div>
                <h3 className="font-semibold text-xl">Business Software</h3>
                <p className="text-sm text-muted-foreground">
                  Custom software solutions for your unique business needs
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Get In Touch
            </h2>
            <p className="text-muted-foreground text-lg">
              Ready to transform your business? Let's talk.
            </p>
          </div>

          <Card className="border-2">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Email */}
                <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a
                      href="mailto:contact.seltro@gmail.com"
                      className="text-muted-foreground hover:text-primary transition-colors break-all"
                    >
                      contact.seltro@gmail.com
                    </a>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-accent/50 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <a
                      href="tel:+919935409310"
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      +91 9935409310
                    </a>
                  </div>
                </div>

                {/* Location */}
                <div className="flex items-start space-x-4 p-4 rounded-lg hover:bg-accent/50 transition-colors md:col-span-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">Location</h3>
                    <p className="text-muted-foreground">
                      Serving businesses across Kanpur, Uttar Pradesh
                    </p>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <div className="mt-8 text-center">
                <Button
                  size="lg"
                  className="group"
                  onClick={() =>
                    (window.location.href = "mailto:contact.seltro@gmail.com")
                  }
                >
                  <Mail className="mr-2 group-hover:scale-110 transition-transform" />
                  Send us a message
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Seltro. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">
              Smart IT Solutions • Kanpur, India
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
