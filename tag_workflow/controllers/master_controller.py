'''
	Added by Sahil
	Email sahil19893@Gmail.com
'''

import frappe
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller
from frappe import enqueue

class MasterController(base_controller.BaseController):
    def validate_master(self):
        super(MasterController, self).validate()
        self.update_master_data()

    def update_master_data(self):
        if(self.dt == "Company"):
            self.check_mandatory_field()

            if not frappe.db.exists("Customer", {"name": self.doc.name}): 
                customer = frappe.get_doc(dict(doctype = "Customer", customer_name = self.doc.name, customer_type = "Company", territory = "All Territories", customer_group = "All Customer Groups", ))
                customer.insert(ignore_permissions=True)
        elif(self.dt == "User"):
            if not self.doc.tag_user_type or not self.doc.organization_type:
                frappe.throw(_("Please select <b>Organization Type</b> and <b>TAG User Type</b> before saving the User."))
        elif(self.dt == "Item"):
            if not frappe.db.exists("Activity Type", {"name": self.doc.name}):
                item = frappe.get_doc(dict(doctype = "Activity Type", activity_type = self.doc.name))
                item.save(ignore_permissions=True)

    def check_mandatory_field(self):
        if not frappe.db.exists("Territory", {"name": "All Territories"}):
            tre_doc = frappe.get_doc(dict(doctype="Territory", territory_name="All Territories", is_group=0))
            tre_doc.save(ignore_permissions=True)

        if not frappe.db.exists("Customer Group", {"name": "All Customer Groups"}):
            group_doc = frappe.get_doc(dict(doctype="Customer Group", customer_group_name="All Customer Groups", is_group=1))
            group_doc.save(ignore_permissions=True)


#-----------after company insert update-------------#
def get_user_list():
    return frappe.db.sql(""" select name from `tabUser` where enabled = 1 and tag_user_type in ("Staffing Admin", "Staffing User")""", as_dict=1)

def update_user_permission(user_list, company):
    try:
        permission = ["Job Order"]
        for perm in permission:
            for user in user_list:
                if not frappe.db.exists("User Permission",{"user": user.name,"allow": "Company","applicable_for": perm,"for_value": company,"apply_to_all_doctypes":0}):
                    perm_doc = frappe.get_doc(dict(doctype="User Permission",user=user.name,allow="Company",for_value=company,applicable_for=perm,apply_to_all_doctypes=0))
                    perm_doc.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Quotation and Job Order Permission")

@frappe.whitelist()
def make_update_comp_perm(docname):
    try:
        doc = frappe.get_doc("Company", docname)
        if doc.organization_type == "Exclusive Hiring":
            if not frappe.db.exists("User Permission", {"user":frappe.session.user, "allow":"Company", "for_value": doc.name, "apply_to_all_doctypes": 1}):
                perm = frappe.get_doc(dict(doctype = "User Permission", user = frappe.session.user, allow = "Company", for_value = doc.name, apply_to_all_doctypes = 1))
                perm.save(ignore_permissions=True)
        elif doc.organization_type != "Staffing":
            user_list = get_user_list()
            enqueue("tag_workflow.controllers.master_controller.update_user_permission", user_list=user_list, company=doc.name)
    except Exception as e:
        frappe.error_log(e, "Quotation and Job Order Permission")


@frappe.whitelist()
def check_item_group():
    try:
        if not frappe.db.exists("Item Group", {"name": "Services"}):
            group = frappe.get_doc(dict(doctype="Item Group", item_group_name="Services", is_group=0))
            group.save(ignore_permissions=True)
    except Exception as e:
        frappe.error_log(e, "Item Group")
