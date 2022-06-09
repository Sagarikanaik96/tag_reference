import frappe
import requests


@frappe.whitelist()
def get_link1(name, userid):
   company = frappe.get_doc("Company", name)
   review=[]
   if company.organization_type == 'Staffing':
      sql= """select * from `tabCompany Review`"""
      data = frappe.db.sql(sql, as_dict=True)
      for i in data:
         if i['staffing_company']== name:
            review.append((i['rating'],i['comments'],i['hiring_company']))
   elif company.organization_type == 'Hiring' or company.organization_type == 'Exclusive Hiring':
      sql= """select * from `tabHiring Company Review`"""
      data= frappe.db.sql(sql, as_dict=True)
      for i in data:
         if i['hiring_company']== name:
            review.append((i['rating'],i['comments'],i['staffing_company']))

   users=[]
   sql1= f"select full_name, enabled from `tabUser` where company='{name}' and enabled=1"
   data1 = frappe.db.sql(sql1, as_dict=True)
   for i in data1:
      users.append(i['full_name'])

   return company, review, data1

@frappe.whitelist()
def get_link2(name,comp, comp_type, user_id):
   sql3= f"select company from `tabEmployee` where user_id='{user_id}'"
   data3 = frappe.db.sql(sql3, as_dict=True)  
   if len(data3)>1:
      return data3,"exceed"
   else:
      if comp_type== "Staffing":
         company1= comp
         company2= name

      else:
         company1= name
         company2= comp
   

      sql2= f"select job_order, job_category, tag_status, company, hiring_organization from `tabAssign Employee` where company='{company1}' and hiring_organization= '{company2}' and tag_status= 'Approved' order by job_order desc"
      data2= frappe.db.sql(sql2, as_dict=True)
      job=[]
      invoice=[]
      for j in data2:
         job1= j["job_order"]
         jo= frappe.get_doc("Job Order", j["job_order"])
         job.append(jo)
        
         sql4= f"select job_order, sum(total_billing_amount) as total_billing_amount from `tabSales Invoice` where job_order='{job1}'"
         data4 = frappe.db.sql(sql4, as_dict=True)  
         for i in data4:
            invoice.append(i)

      return job, data2, invoice


@frappe.whitelist()
def get_link3(name,comp, comp_type):
   if comp_type== "Staffing":
      company1= comp
      company2= name

   else:
      company1= name
      company2= comp
   

   sql2= f"select job_order, job_category, tag_status, company, hiring_organization from `tabAssign Employee` where company='{company1}' and hiring_organization= '{company2}' and tag_status= 'Approved' order by job_order desc"
   data2= frappe.db.sql(sql2, as_dict=True)
   job=[]
   invoice=[]
   for j in data2:
      job1= j["job_order"]
      jo= frappe.get_doc("Job Order", j["job_order"])
      job.append(jo)
     
      sql4= f"select job_order, sum(total_billing_amount) as total_billing_amount from `tabSales Invoice` where job_order='{job1}'"
      data4 = frappe.db.sql(sql4, as_dict=True)  
      for i in data4:
         invoice.append(i)

   return job, data2, invoice
