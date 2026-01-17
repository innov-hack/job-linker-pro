import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings as SettingsIcon, User, Bell, Link2 } from "lucide-react";

export default function Settings() {
  return (
    <div className="min-h-screen py-12 sm:py-16">
      <div className="container-page">
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold sm:text-4xl">Settings</h1>
            <p className="mt-2 text-muted-foreground">
              Manage your account preferences and configurations
            </p>
          </div>

          {/* Placeholder Banner */}
          <div className="mb-8 rounded-xl bg-muted/50 border border-border p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Placeholder:</strong> These settings are for demonstration
              purposes only. Backend functionality is not implemented.
            </p>
          </div>

          <div className="space-y-8">
            {/* Profile Section */}
            <div className="card-elevated p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Profile</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage your account information
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      defaultValue="Jane Smith"
                      className="input-modern"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      defaultValue="jane@linkrecruit.app"
                      className="input-modern"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    placeholder="Your company name"
                    defaultValue="Acme Recruiting"
                    className="input-modern"
                  />
                </div>
              </div>
            </div>

            {/* Notifications Section */}
            <div className="card-elevated p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Notifications</h2>
                  <p className="text-sm text-muted-foreground">
                    Configure how you receive updates
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about link activity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Weekly Reports</p>
                    <p className="text-sm text-muted-foreground">
                      Get a weekly summary of your job links
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Marketing Emails</p>
                    <p className="text-sm text-muted-foreground">
                      Receive news and product updates
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            {/* Link Settings Section */}
            <div className="card-elevated p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Link2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Link Preferences</h2>
                  <p className="text-sm text-muted-foreground">
                    Customize how your job links behave
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="domain">Custom Domain</Label>
                  <Input
                    id="domain"
                    placeholder="jobs.yourcompany.com"
                    className="input-modern"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use your own domain for job links (requires DNS setup)
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Link Expiration</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically expire links after 30 days
                    </p>
                  </div>
                  <Switch />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button size="lg">Save Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
