'''
    update organization field in listed doctype
'''

import frappe

ADD_ORGANIZATION = ["Company", "User"]

def update_organization():
    try:
        for docs in ADD_ORGANIZATION:
            if not frappe.db.exists("Custom Field", {"dt": docs, "label": "Organization Type"}):
                custom_doc = frappe.get_doc(dict(
                    doctype="Custom Field",
                    dt = docs,
                    label = "Organization Type",
                    fieldtype = "Link",
                    options = "Organization Type",
                    reqd = 1
                ))
                custom_doc.save()
    except Exception as e:
        print(e)
