'''
	Added by Sahil
	Email sahil19893@Gmail.com
'''

import frappe
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller

class MasterController(base_controller.BaseController):
    def validate_master(self):
        super(MasterController, self).validate()
        self.update_master_data()

    def update_master_data(self):
        if(self.dt == "Company"):
            if not frappe.db.exists("Customer", {"name": self.doc.name}):
                customer = frappe.get_doc(dict(doctype = "Customer", customer_name = self.doc.name, customer_type = "Company", territory = "All Territories", customer_group = "All Customer Groups", ))
                customer.insert(ignore_permissions=True)
        elif(self.dt == "User"):
            if(self.doc.tag_user_type and self.doc.organization_type):
                if(self.doc.tag_user_type == "Hiring Admin"):
                    self.doc.role_profile_name = "Hiring Admin"
                    self.doc.module_profile = "Hiring"
                elif(self.doc.tag_user_type == "Hiring User"):
                    self.doc.role_profile_name = "Hiring User"
                    self.doc.module_profile = "Hiring"
                elif(self.doc.tag_user_type == "Staffing Admin"):
                    self.doc.role_profile_name = "Staffing Admin"
                    self.doc.module_profile = "Staffing"
                elif(self.doc.tag_user_type == "Staffing User"):
                    self.doc.role_profile_name = "Staffing User"
                    self.doc.module_profile = "Staffing"
            else:
                frappe.throw(_("Please select <b>Organization Type</b> and <b>TAG User Type</b> before saving the User."))
        elif(self.dt == "Item"):
            if not frappe.db.exists("Activity Type", {"name": self.doc.name}):
                item = frappe.get_doc(dict(doctype = "Activity Type", activity_type = self.doc.name))
                item.save()
