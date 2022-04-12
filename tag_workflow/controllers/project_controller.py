'''
    Project Controller
'''

import frappe
from frappe import enqueue
from frappe import _, msgprint, throw
from tag_workflow.controllers import base_controller
from tag_workflow.utils.timesheet import denied_notification, approval_notification
from frappe import enqueue

class ProjectController(base_controller.BaseController):
    def validate_project(self):
        if(self.doc.workflow_state == "Denied" and frappe.db.get_value("User", frappe.session.user, "organization_type") not in ["Hiring", "Exclusive Hiring"]):
            enqueue("tag_workflow.utils.timesheet.denied_notification", job_order=self.doc.job_order_detail, hiring_company=self.doc.company, staffing_company=self.doc.employee_company, timesheet_name=self.doc.name)
        elif(self.doc.workflow_state == "Approved"):
            enqueue("tag_workflow.utils.timesheet.approval_notification", job_order=self.doc.job_order_detail, staffing_company=self.doc.employee_company, date=None, hiring_company=self.doc.company, timesheet_name=self.doc.name, timesheet_approved_time=self.doc.modified, current_time=frappe.utils.now())
