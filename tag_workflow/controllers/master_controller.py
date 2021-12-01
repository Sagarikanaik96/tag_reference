'''
	Added by Sahil
	Email sahil19893@Gmail.com
'''

import frappe
from frappe.share import add
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller
from frappe import enqueue
from tag_workflow.utils.trigger_session import share_company_with_user

GROUP = "All Customer Groups"
TERRITORY = "All Territories"
PERMISSION = "User Permission"
EMP = "Employee"
COM = "Company"

class MasterController(base_controller.BaseController):
    def validate_master(self):
        self.update_master_data()

    def update_master_data(self):
        if(self.dt == COM):
            self.check_mandatory_field()

            if not frappe.db.exists("Customer", {"name": self.doc.name}): 
                customer = frappe.get_doc(dict(doctype="Customer", customer_name=self.doc.name, customer_type="Company", territory=TERRITORY, customer_group=GROUP))
                customer.insert(ignore_permissions=True)
        elif(self.dt == "User"):
            if not self.doc.tag_user_type or not self.doc.organization_type:
                frappe.throw(_("Please select <b>Organization Type</b> and <b>TAG User Type</b> before saving the User."))
        elif(self.dt == "Item"):
            self.check_activity_type()

    def check_mandatory_field(self):
        if not frappe.db.exists("Territory", {"name": TERRITORY}):
            tre_doc = frappe.get_doc(dict(doctype="Territory", territory_name=TERRITORY, is_group=0))
            tre_doc.save(ignore_permissions=True)

        if not frappe.db.exists("Customer Group", {"name": GROUP}):
            group_doc = frappe.get_doc(dict(doctype="Customer Group", customer_group_name=GROUP, is_group=1))
            group_doc.save(ignore_permissions=True)

    def check_activity_type(self):
        if not frappe.db.exists("Activity Type", {"name": self.doc.name}):
            item = frappe.get_doc(dict(doctype = "Activity Type", activity_type = self.doc.name))
            item.save(ignore_permissions=True)


#-----------after company insert update-------------#
def get_user_list(company=None):
    if company:
        return frappe.db.sql(""" select name from `tabUser` where enabled = 1 and tag_user_type in ("Staffing Admin", "Staffing User") and company = %s """,company, as_dict=1)
    else:
        return frappe.db.sql(""" select name from `tabUser` where enabled = 1 and tag_user_type in ("Staffing Admin", "Staffing User")""", as_dict=1)


def update_user_permission(user_list, company):
    try:
        permission = ["Job Order"]
        for perm in permission:
            for user in user_list:
                if not frappe.db.exists(PERMISSION,{"user": user.name,"allow": COM,"applicable_for": perm,"for_value": company,"apply_to_all_doctypes":0}):
                    perm_doc = frappe.get_doc(dict(doctype=PERMISSION,user=user.name,allow=COM,for_value=company,applicable_for=perm,apply_to_all_doctypes=0))
                    perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Quotation and Job Order Permission")

def update_exclusive_perm(user_list, company):
    try:
        for user in user_list:
            if not frappe.db.exists(PERMISSION, {"user": user['name'], "allow":COM, "for_value": company, "apply_to_all_doctypes": 1}):
                add(COM, company, user['name'], write=1, read=1, share=0, everyone=0, notify=0, flags={"ignore_share_permission": 1})
                perm = frappe.get_doc(dict(doctype=PERMISSION, user=user['name'], allow=COM, for_value=company, apply_to_all_doctypes = 1))
                perm.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Exclusive Permission")

@frappe.whitelist()
def make_update_comp_perm(docname):
    try:
        doc = frappe.get_doc(COM, docname)
        if doc.organization_type == "Exclusive Hiring":
            user_list = get_user_list(doc.parent_staffing)
            enqueue("tag_workflow.controllers.master_controller.update_exclusive_perm", user_list=user_list, company=doc.name)
        elif doc.organization_type != "Staffing":
            user_list = get_user_list()
            enqueue("tag_workflow.controllers.master_controller.update_user_permission", user_list=user_list, company=doc.name)
    except Exception as e:
        frappe.error_log(e, "Quotation and Job Order Permission")


@frappe.whitelist()
def check_item_group():
    try:
        item_group = "Item Group"
        if not frappe.db.exists(item_group, {"name": "Services"}):
            group = frappe.get_doc(dict(doctype=item_group, item_group_name="Services", is_group=0))
            group.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, item_group)


# remove message on user creation
def make_employee_permission(user, emp, company):
    try:
        perms = [COM, EMP]
        data = [company, emp]
        for per in range(0, len(perms)):
            if not frappe.db.exists(PERMISSION,{"user": user,"allow": perms[per],"apply_to_all_doctypes":1, "for_value": data[per]}):
                perm_doc = frappe.get_doc(dict(doctype=PERMISSION,user=user, allow=perms[per], for_value=data[per], apply_to_all_doctypes=1))
                perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, PERMISSION)

def check_user_data(user, company, organization_type=None):
    try:
        if not organization_type:
            organization_type = frappe.db.get_value("User", user, "organization_type")

        if(organization_type == "Staffing"):
            exclusive = frappe.get_list("Company", {"parent_staffing": company}, "name")
            for ex in exclusive:
                update_exclusive_perm([{"name": user}], ex.name)
    except Exception as e:
        frappe.error_log(e, "check_user_data")


@frappe.whitelist()
def check_employee(name, first_name, company, last_name=None, gender=None, date_of_birth=None, date_of_joining=None, organization_type=None):
    users = [{"name": name, "company": company}]
    share_company_with_user(users)
    if not frappe.db.exists(EMP, {"user_id": name}):
        emp = frappe.get_doc(dict(doctype=EMP, first_name=first_name, last_name=last_name, company=company, status="Active", gender=gender, date_of_birth=date_of_birth, date_of_joining=date_of_joining, user_id=name, create_user_permission=1, email=name))
        emp.save(ignore_permissions=True)
    else:
        emp = frappe.get_doc(EMP, {"user_id": name})

        if company != emp.company:
            frappe.db.sql(""" delete from `tabUser Permission` where user = %s and company = %s """, name, emp.company)
        emp.first_name=first_name
        emp.last_name=last_name
        emp.company=company
        emp.gender=gender
        emp.date_of_birth=date_of_birth
        emp.date_of_joining=date_of_joining
        emp.create_user_permission=1
        emp.save(ignore_permissions=True)

    if(organization_type != "TAG"):
        make_employee_permission(name, emp.name, company)
        enqueue("tag_workflow.controllers.master_controller.check_user_data", user=name, company=company, organization_type=None)
