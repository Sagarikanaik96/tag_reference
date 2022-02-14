# Copyright (c) 2021, SourceFuse and contributors
# For license information, please see license.txt
import frappe, tag_workflow
from frappe import _
import requests, json
import googlemaps
from frappe.model.document import Document

class AssignEmployee(Document):
    pass


distance_value = {"5 miles": 5, "10 miles": 10, "20 miles": 20, "50 miles": 50}

def get_api_key():
    try:
        api_key = tag_workflow.get_key("gmap")
        if(api_key == 'Error'):
            return "AIzaSyDRCtr2OCT1au8HCjMQPivkhIknFI7akIU"
        return api_key
    except Exception:
        return ''

def get_souce(location=None):
    try:
        source = []
        if(location):
            site = frappe.db.get_list("Job Site", {"name": location}, ["address", "city", "state", "zip"], ignore_permissions=True)
            for s in site:
                source = [s['address'], s['city'], s['state'], str(s['zip'])]
        return ",".join(source)
    except Exception:
        return ",".join(source)

def get_dest(dest):
    try:
        street = dest['street_address'] if dest['street_address'] else ''
        city = dest['city'] if dest['city'] else ''
        state = dest['state'] if dest['state'] else ''
        ZIP = str(dest['zip']) if dest['zip'] != 0 else ''
        return street+","+city+","+state+","+ZIP
    except Exception as e:
        print(e)
        return ''


def check_distance(emp, distance, location):
    try:
        result, source = [], []
        api_key = get_api_key()

        if not api_key:
            frappe.msgprint(_("GMAP api key not found"))
            return ()

        gmaps = googlemaps.Client(key=api_key)
        source = get_souce(location)
        for e in emp:
            try:
                dest = get_dest(e)
                my_dist = gmaps.distance_matrix(source, ",".join(dest))
                if(my_dist['status'] == 'OK' and my_dist['rows'][0]['elements'][0]['distance']):
                    km = my_dist['rows'][0]['elements'][0]['distance']['value']/1000
                    if(km is not None and ((km*0.62137) <= distance_value[distance] or km == 0)):
                        result.append((e['name'], e['employee_name']))
            except Exception as e:
                print(e)
                continue
        return tuple(result)
    except Exception as e:
        print(e, "google")
        return ()


@frappe.whitelist()
def get_employee(doctype, txt, searchfield, page_len, start, filters):
    try:
        emp_company = filters.get('emp_company')
        job_category = filters.get('job_category')
        company = filters.get('company')
        distance = filters.get('distance_radius')
        job_location = filters.get('job_location')
        employee_lis = filters.get('employee_lis')
        value = ''
        for index ,i in enumerate(employee_lis):
            if index >= 1:
                value = value+"'"+","+"'"+i
            else:
                value =value+i
        if job_category is None:
            sql = """ select name, employee_name from `tabEmployee` where company='{0}' and status='Active' and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from='{1}') and (name NOT IN (select parent from `tabUnsatisfied Organization`  where unsatisfied_organization_name='{0}')) and (name NOT IN (select parent from `tabDNR` BE where dnr='{1}'))) and name NOT IN ('{2}') and name employee_like '{3}' """.format(emp_company, company,value, '%%%s%%' % txt)
        else:
            sql = """select name, employee_name, street_address, city, state, zip from `tabEmployee` where company='{0}' and status='Active' and (job_category = '{1}' or job_category IS NULL) and (name NOT IN (select parent from `tabBlocked Employees`  where blocked_from='{2}')) and (name NOT IN (select parent from `tabDNR`  where dnr='{2}' )) and (name NOT IN (select parent from `tabUnsatisfied Organization` where unsatisfied_organization_name = '{2}')) and name NOT IN ('{3}') and employee_name like '{4}' """.format(emp_company, job_category, company, value, '%%%s%%' % txt)
        emp = frappe.db.sql(sql, as_dict=1)
        
        result = check_distance(emp, distance, job_location)
        return result
    except Exception:
        return tuple()

@frappe.whitelist()
def worker_data(job_order):
    sql=f"select no_of_workers,worker_filled from `tabJob Order` where name='{job_order}'"
    data=frappe.db.sql(sql,as_dict=True)
    return data

@frappe.whitelist()
def approved_workers(job_order,staffing_org):
    sql=f"select approved_no_of_workers from `tabClaim Order` where job_order='{job_order}' and staffing_organization='{staffing_org}' "
    data=frappe.db.sql(sql,as_dict=True)
    return data
