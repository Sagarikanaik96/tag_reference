from time import process_time
import frappe


@frappe.whitelist()
def comp(comp_id=None):
    user_name=frappe.session.user
    if user_name=='Administrator':
        data=frappe.db.sql("""select name,address,city,state,zip,average_rating from `tabCompany` where organization_type='Staffing'""", as_dict=True)
        if comp_id:
                data=frappe.db.sql(""" select name,address,city,state,zip,average_rating from `tabCompany` where organization_type='Staffing'""", as_list=True)
                company_name=data[int(comp_id)-1][0]
                return company_data(company_name)
                
    else:
        user_type=frappe.db.sql(''' select organization_type from `tabUser` where email='{}' '''.format(user_name),as_list=1)
        if user_type[0][0]=='Hiring':
            user_comp=frappe.db.sql(''' select company from `tabUser` where email='{}' '''.format(user_name),as_list=1)
            data=frappe.db.sql("""  select * from `tabCompany` where name in (select parent from `tabIndustry Types` where parent in (select name from `tabCompany` where organization_type='Staffing') and industry_type in (select industry_type  from `tabIndustry Types` where parent='{}')) """.format(user_comp[0][0]), as_dict=True)
            if comp_id:
                data=frappe.db.sql("""  select * from `tabCompany` where name in (select parent from `tabIndustry Types` where parent in (select name from `tabCompany` where organization_type='Staffing') and industry_type in (select industry_type  from `tabIndustry Types` where parent='{}')) """.format(user_comp[0][0]), as_list=True)
                company_name=data[int(comp_id)-1][0]
                return company_data(company_name)      
    return data

def company_data(company_name):
    company_detail=frappe.db.sql(""" select * from `tabCompany` where name="{}" """.format(company_name),as_dict=True)
    company_industry=frappe.db.sql(""" select industry_type from `tabIndustry Types` where parent='{}'""".format(company_name),as_dict=True)
    team_member=frappe.db.sql(""" select first_name,last_name from `tabUser` where company='{}' """.format(company_name),as_dict=True)
    company_review_rating=frappe.db.sql("""select owner,rating,comments,creation from `tabCompany Review` where staffing_company='{}' """.format(company_name),as_dict=True)
    return company_detail,company_industry,team_member,company_review_rating  