import frappe

@frappe.whitelist()
def lead_owner(doctype,txt,searchfield,page_len,start,filters):
    try:
        owner_company=filters.get('owner_company')
        sql = ''' select name from `tabUser` where company="{0}" '''.format(owner_company)
        return frappe.db.sql(sql)
    except Exception as e:
        frappe.error_log(e, "Lead Owner for Lead")
        frappe.throw(e)