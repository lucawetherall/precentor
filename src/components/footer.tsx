import Link from "next/link";

export function Footer() {
  return (
    <footer className="px-4 sm:px-8 py-10 border-t border-border">
      <div className="max-w-4xl mx-auto">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 sm:col-span-1">
            <span className="font-heading font-semibold text-foreground text-sm">
              Precentor
            </span>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              AI-powered church music planning for the Church of England.
            </p>
          </div>

          <div>
            <p className="small-caps text-xs text-muted-foreground mb-2">Product</p>
            <ul className="space-y-1.5">
              <FooterLink href="/about">About</FooterLink>
              <FooterLink href="/faq">FAQ</FooterLink>
              <FooterLink href="/signup">Get Started</FooterLink>
            </ul>
          </div>

          <div>
            <p className="small-caps text-xs text-muted-foreground mb-2">Support</p>
            <ul className="space-y-1.5">
              <FooterLink href="/contact">Contact</FooterLink>
              <FooterLink href="mailto:hello@precentor.app">Email Us</FooterLink>
            </ul>
          </div>

          <div>
            <p className="small-caps text-xs text-muted-foreground mb-2">Legal</p>
            <ul className="space-y-1.5">
              <FooterLink href="/privacy">Privacy Notice</FooterLink>
              <FooterLink href="/terms">Terms of Service</FooterLink>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-6 text-xs text-muted-foreground text-center">
          &copy; {new Date().getFullYear()} Precentor. Built for the Church of
          England.
        </div>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const isExternal = href.startsWith("mailto:") || href.startsWith("http");
  if (isExternal) {
    return (
      <li>
        <a
          href={href}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {children}
        </a>
      </li>
    );
  }
  return (
    <li>
      <Link
        href={href}
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {children}
      </Link>
    </li>
  );
}
