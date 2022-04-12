import frappe
import requests


@frappe.whitelist()
def get_link1(name):
   company = frappe.get_doc("Company", name)

   sql = """select * from `tabCompany Review`  """
   data = frappe.db.sql(sql, as_dict=True)
   review=[]
   for i in data:      
      if i['staffing_company']== name:
         review.append((i['rating'],i['comments'],i['hiring_company']))

   users=[]
   sql1= f"select full_name, enabled from `tabUser` where company='{name}' and enabled=1"
   data1 = frappe.db.sql(sql1, as_dict=True)
   for i in data1:
      users.append(i['full_name'])
   return company, review, data1


   

