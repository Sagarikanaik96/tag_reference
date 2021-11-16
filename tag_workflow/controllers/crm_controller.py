'''
    CRM Controller For Lead
'''

import frappe
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller

class CRMController(base_controller.BaseController):
    def validate_crm(self):
        self.check_lead_closing()

    def check_lead_closing(self):
        if self.doc.status == "Close" and not self.doc.signature:
            frappe.throw("Please add Signature before closing Lead")
