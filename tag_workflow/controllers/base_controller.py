'''
        Developer: Sahil
        Email: sahil19893@gmail.com
'''

import frappe, json
from frappe import _, msgprint, throw

MASTER = ["Company", "User", "Item"]

def validate_controller(doc, method):
    doctype = doc.meta.get("name")
    controller = None

    try:
        if doctype in MASTER:
            from tag_workflow.controllers.master_controller import MasterController
            if method == "validate":
                MasterController(doc, doctype, method).validate_master()
    except Exception as e:
        frappe.throw(e)
        print("----"*10)
        print(frappe.get_traceback())
        print("----"*10)


'''
	Base controller for validation purpose
'''

class BaseController():
    def __init__(self, doc, doctype, method):
        self.dt = doctype
        self.doc = doc
        self.method = method

    def validate(self):
        print("sahil is here")
