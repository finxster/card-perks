import { Link } from "wouter";
import { Separator } from "@/components/ui/separator";

export function AppFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:space-y-0">
          <div className="flex flex-col space-y-2">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} CardPerks - Made by{" "}
              <span className="font-medium text-foreground">FinxSoft Apps</span>
            </p>
          </div>
          
          <div className="flex flex-col space-y-2 md:flex-row md:space-x-6 md:space-y-0">
            <Link href="/privacy-policy">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy Policy
              </a>
            </Link>
            <Link href="/terms-of-use">
              <a className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms of Use
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}