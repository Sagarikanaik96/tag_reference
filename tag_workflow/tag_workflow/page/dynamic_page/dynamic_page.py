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
   return company, review


   

