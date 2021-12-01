import frappe
from frappe import _

def validate_username(self):
    if not self.username and self.is_new() and self.first_name:
        self.username = frappe.scrub(self.first_name)

    if not self.username:
        return

    username = self.suggest_username()
    self.username = username

def suggest_username(self):
    def _check_suggestion(suggestion):
        if self.username != suggestion and not self.username_exists(suggestion):
            return suggestion
        return None

    # @firstname
    username = _check_suggestion(frappe.scrub(self.first_name))

    if not username:
        # @firstname_last_name
        username = _check_suggestion(frappe.scrub("{0} {1}".format(self.first_name, self.last_name or "")))

    return username
