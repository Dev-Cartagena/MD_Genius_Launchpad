import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Logo, NodeRule } from "@/components/brand";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-8 bg-background px-4">
      <Logo layout="compact" className="h-8" />
      <div className="panel w-full max-w-md p-6 sm:p-8">
        <p className="font-display text-sm text-muted-foreground mb-2">Error 404</p>
        <h1 className="text-2xl font-medium mb-4">Page not found</h1>
        <NodeRule className="mb-4" />
        <p className="text-sm text-muted-foreground mb-6">
          The page you are looking for does not exist or may have moved. Check the address, or go back to the home page.
        </p>
        <Button asChild>
          <Link href="/">Go to home page</Link>
        </Button>
      </div>
    </div>
  );
}
