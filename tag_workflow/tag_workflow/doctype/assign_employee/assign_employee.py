# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe
from frappe import _
import requests, json
import googlemaps
from frappe.model.document import Document

class AssignEmployee(Document):
    pass


distance_value = {"5 miles": 5, "10 miles": 10, "20 miles": 20, "50 miles": 50}

@frappe.whitelist()
def get_employee(doctype, txt, searchfield, page_len, start, filters):
    try:
        emp_company = filters.get('emp_company')
        job_category = filters.get('job_category')
        company = filters.get('company')
        distance = filters.get('distance_radius')
        job_location = filters.get('job_location')

        if job_category is None:
            sql = """ select name, employee_name from `tabEmployee` where company='{0}' and status='Active' and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from='{1}') and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{0}')) and (name NOT IN (select parent from `tabDNR` BE where dnr='{1}')) """.format(emp_company, company)
        else:
            sql = """select name, employee_name, street_address, city, state, zip from `tabEmployee` where company='{0}' and status='Active' and (job_category = '{1}' or job_category IS NULL) and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from='{2}')) and (name NOT IN (select parent from `tabDNR`  where dnr='{2}' )) and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{2}'))""".format(emp_company, job_category, company)

        emp = frappe.db.sql(sql, as_dict=1)
        result = check_distance(emp, distance, job_location)
        return result 
    except Exception as e:
        frappe.msgprint(e)
        return tuple()


def check_distance(emp, distance, location):
    try:
        result = []
        api_key = 'AIzaSyDRCtr2OCT1au8HCjMQPivkhIknFI7akIU'
        gmaps = googlemaps.Client(key=api_key)
        source = location or ''

        for e in emp:
            dest = [e['street_address'], e['city'], e['state']]
            dest = ",".join([d for d in dest if d])
            if(dest):
                my_dist = gmaps.distance_matrix(source, dest)
                if(my_dist['status'] == 'OK'):
                    km = my_dist['rows'][0]['elements'][0]['distance']['value']
                    if(km is not None and ((km*0.62137) <= distance_value[distance] or km == 0)):
                        result.append((e['name'], e['employee_name']))
        return tuple(result)
    except Exception as e:
        print(e, "google")
        return ()
