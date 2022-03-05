import frappe

@frappe.whitelist()
def lead_owner(doctype,txt,searchfield,page_len,start,filters):
    try:
        owner_company=filters.get('owner_company')
        sql = ''' select name from `tabUser` where company="{0}" '''.format(owner_company)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e, "Lead Owner for Lead")
        frappe.throw(e)

@frappe.whitelist(allow_guest=False)
def contact_person(doctype,txt,searchfield,page_len,start,filters):
    try:
        owner_company=filters.get('owner_company')
        sql = ''' select name from `tabUser` where company="{0}" '''.format(owner_company)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.log_error(e,'Next Contact person')
        frappe.throw(e)