import frappe
from frappe import _
from frappe.utils import (cint, flt, has_gravatar, escape_html, format_datetime, now_datetime, get_formatted_email, today)


# user method update
STANDARD_USERS = ("Guest", "Administrator")

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


def send_login_mail(self, subject, template, add_args, now=None):
    """send mail with login details"""
    from frappe.utils.user import get_user_fullname
    from frappe.utils import get_url

    created_by = get_user_fullname(frappe.session['user'])
    if created_by == "Guest":
        created_by = "Administrator"

    args = {
            'first_name': self.first_name or self.last_name or "user",
            'user': self.name,
            'title': subject,
            'login_url': get_url(),
            'created_by': created_by
    }

    args.update(add_args)

    onboard = 0
    company, email = "", ""
    parent = frappe.db.get_value("Company", self.company, "parent_staffing")
    if(parent):
        onboard = 1
        company = parent
        email = self.name
        subject = "Notification from TAG"
    else:
        subject = "Welcome to TAG! Account Verification"

    args.update({"onboard": onboard, "company": company, "email": email})

    sender = frappe.session.user not in STANDARD_USERS and get_formatted_email(frappe.session.user) or None
    frappe.sendmail(recipients=self.email, sender=sender, subject=subject, template=template, args=args, header="", delayed=(not now) if now!=None else self.flags.delay_emails, retry=3)

# document method update
def raise_no_permission_to(self, perm_type):
    """Raise `frappe.PermissionError`."""
    if(not self.doctype == "Company" and not self.parent_staffing):
        frappe.flags.error_message = _('Insufficient Permission for {0}, {1}').format(self.doctype, self.owner)
        raise frappe.PermissionError
