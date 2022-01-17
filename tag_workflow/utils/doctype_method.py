import frappe
from frappe import _
import re
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
    user_list = frappe.db.get_list("User", {"company": self.company}, "name")
    if(parent and (len(user_list) <= 1)):
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
    if(self.doctype not in ["Company", "Assign Employee"]):
        frappe.flags.error_message = _('Insufficient Permission for {0}, {1}').format(self.doctype, self.owner)
        raise frappe.PermissionError

#validate_duplicate_user_id
def validate_duplicate_user_id(self):
    sql = """select name from `tabEmployee` where user_id = '{0}' and status = 'Active' and name != '{1}' """.format(self.user_id, self.name)
    employee = frappe.db.sql_list(sql)
    print(employee)


# abbr validation
def append_number_if_name_exists(doctype, value, fieldname="abbr", separator="-", filters=None):
    if not filters:
        filters = dict()
    filters.update({fieldname: value})
    exists = frappe.db.exists(doctype, filters)
    regex = "^{value}{separator}\\d+$".format(value=re.escape(value), separator=separator)
    
    if(exists):
        sql = """SELECT `{fieldname}` FROM `tab{doctype}` WHERE `{fieldname}` {regex_character} %s ORDER BY length({fieldname}) DESC, `{fieldname}` DESC LIMIT 1""".format(doctype=doctype, fieldname=fieldname, regex_character=frappe.db.REGEX_CHARACTER)
        last = frappe.db.sql(sql, regex)

        if last:
            count = str(cint(last[0][0].rsplit(separator, 1)[1]) + 1)
        else:
            count = "1"

        value = "{0}{1}{2}".format(value, separator, count)
    return value


def validate_abbr(self):
    if not self.abbr:
        self.abbr = ''.join(c[0] for c in self.company_name.split()).upper()

    self.abbr = self.abbr.strip()

    if not self.abbr.strip():
        frappe.throw(_("Abbreviation is mandatory"))

    sql = "select abbr from tabCompany where name != '{0}' and abbr = '{1}' ".format(self.name, self.abbr)
    if frappe.db.sql(sql):
        self.abbr = append_number_if_name_exists("Company", self.abbr, fieldname="abbr", separator="-", filters=None)

#-----navbar settings-------#
def validate_standard_navbar_items(self):
    doc_before_save = self.get_doc_before_save()
    print(doc_before_save)

#------crm contact------#
def create_contact(self):
    if not self.lead_name:
        self.set_lead_name()

    names = self.lead_name.strip().split(" ")
    if len(names) > 1:
        first_name, last_name = names[0], " ".join(names[1:])
    else:
        first_name, last_name = self.lead_name, None

    contact = frappe.new_doc("Contact")
    contact.update({
        "first_name": first_name,
        "last_name": last_name,
        "salutation": self.salutation,
        "gender": self.gender,
        "designation": self.designation,
        "company_name": self.company_name,
        "email_address": self.email_id
    })

    if self.company:
        contact.company = self.company
    else:
        contact.company = "TAG"

    if self.email_id:
        contact.append("email_ids", {
            "email_id": self.email_id,
            "is_primary": 1
        })

    if self.phone:
        contact.append("phone_nos", {
            "phone": self.phone,
            "is_primary_phone": 1
        })

    if self.mobile_no:
        contact.append("phone_nos", {
            "phone": self.mobile_no,
            "is_primary_mobile_no":1
        })
    contact.insert(ignore_permissions=True)
    return contact

#-------timesheet------#
def update_cost(self):
    for data in self.time_logs:
        if data.activity_type or data.is_billable:
            rate = get_activity_cost(self.employee, data.activity_type)
            hours = data.billing_hours or 0
            costing_hours = data.billing_hours or data.hours or 0
            if rate:
                data.billing_rate = flt(rate.get('billing_rate')) if flt(data.billing_rate) == 0 else data.billing_rate
                data.costing_rate = flt(rate.get('costing_rate')) if flt(data.costing_rate) == 0 else data.costing_rate
                data.billing_amount = ((data.billing_rate * (hours-data.extra_hours))+data.flat_rate)+(data.extra_hours*data.extra_rate)
                data.costing_amount = data.costing_rate * costing_hours
