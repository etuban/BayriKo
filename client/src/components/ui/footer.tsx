import { Link } from "wouter";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted/30 border-t py-6 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-muted-foreground">
              © {currentYear} BayriKo. All rights reserved.
            </p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <Link href="/privacy-policy">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </Link>
            <Link href="/terms-of-service">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Service
              </a>
            </Link>
            <Link href="/cookies-policy">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Cookies Policy
              </a>
            </Link>
            <Link href="/contact-us">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact Us
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}