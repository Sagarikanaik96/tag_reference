import frappe
from frappe import _

def validate_username(self):
    if not self.username and self.is_new() and self.first_name:
        self.username = frappe.scrub(self.first_name)

    if not self.username:
        return

    # strip space and @
    self.username = self.username.strip(" @")
    if self.username_exists():
        if self.user_type == 'System User':
            #frappe.msgprint(_("Username {0} already exists. sahil is here").format(self.username))
            #self.suggest_username()
            self.username = self.username+"-1"
