import frappe
from frappe import _

def validate_username(self):
    if not self.username and self.is_new() and self.first_name:
        self.username = frappe.scrub(self.first_name)

    if not self.username:
        return

    # strip space and @
    self.username = self.username.strip(" @")
    if self.username_exists() and self.user_type == 'System User':
        self.username = self.username+"-1"
