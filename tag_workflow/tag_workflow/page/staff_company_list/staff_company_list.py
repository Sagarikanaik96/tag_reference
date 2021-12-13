from time import process_time
import frappe


@frappe.whitelist()
def comp():
    user_name=frappe.session.user
    if user_name=='Administrator':
        data=frappe.db.sql("""  select name,address,city,state,zip,average_rating from `tabCompany` where name in (select parent from `tabIndustry Types` where parent in (select name from `tabCompany` where organization_type='Staffing') and industry_type in (select industry_type  from `tabIndustry Types`)) """, as_dict=True)
    else:
        user_type=frappe.db.sql(''' select organization_type from `tabUser` where email='{}' '''.format(user_name),as_list=1)
        if user_type[0][0]=='Hiring':
            user_comp=frappe.db.sql(''' select company from `tabUser` where email='{}' '''.format(user_name),as_list=1)
            data=frappe.db.sql("""  select name,address,city,state,zip,average_rating from `tabCompany` where name in (select parent from `tabIndustry Types` where parent in (select name from `tabCompany` where organization_type='Staffing') and industry_type in (select industry_type  from `tabIndustry Types` where parent='{}')) """.format(user_comp[0][0]), as_dict=True)
    return data