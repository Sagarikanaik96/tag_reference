import frappe
from frappe import _
import zipfile, os, shutil
import itertools, re, datetime
import boto3

#-----------------------------#
TM_FT = "%Y-%m-%d %H-%M-%S"


@frappe.whitelist()
def update_resume(company, zip_file, name, attachment_name, file_name, file_url):
    try:
        pdfs = []
        if frappe.db.exists("File", {"file_name": file_name, "name": attachment_name, "attached_to_doctype": "Company", "file_url": ["in", [zip_file, file_url]]}):
            file_os_path = os.getcwd() + "/" + frappe.get_site_path() + "/public/" + file_url
            dest_os_path = os.getcwd() + "/" + frappe.get_site_path() + "/public/files/" + company + "-" + name + "-" + file_name
            is_extracted = upzip_file(file_os_path, dest_os_path)
            if(is_extracted == 1):
                pdfs = get_pdf_files(dest_os_path)
                frappe.enqueue("tag_workflow.utils.bulk_upload_resume.upload_to_emps", queue='long', is_async=True, company=company, pdfs=pdfs, dest_os_path=dest_os_path)
            else:
                frappe.msgprint(_("<p>The process of unziping the file is failed.</p> \n<p>Error: <b>{0}</b></p> \n<p>Please re-upload the file and try again!</p>").format(is_extracted))
        else:
            frappe.msgprint(_("Some issues is in the zip file. Please re-upload the file and try again !"))
    except Exception as e:
        frappe.msgprint(e)

#----------extracting files--------------#
def upzip_file(file_os_path, dest_os_path):
    try:
        if not os.path.isfile(dest_os_path):
            with zipfile.ZipFile(file_os_path, "r") as zip_ref:
                zip_ref.extractall(dest_os_path)
                zip_ref.close()
        return 1
    except Exception as e:
        frappe.log_error(e, "upzip_file")
        return str(e)

#---------getting all the pdfs from dir---------#
def get_pdf_files(dest_os_path):
    try:
        pdfs = []
        subfolders = [ f.path for f in os.scandir(dest_os_path) if f.is_dir() ]
        if(subfolders):
            subfolders = [ f.path for f in os.scandir(subfolders[0]) if f.is_dir() ]

        for folder in subfolders:
            for(dirpath, dirnames, filenames) in os.walk(folder):
                pdfs.append({"path": dirpath, "filenames": filenames})
        return pdfs
    except Exception as e:
        frappe.log_error(e,  "get_pdf_files")
        return []

#--------updating link to employee----------#
def upload_to_emps(company=None, pdfs=None, dest_os_path=None):
    try:
        for p in pdfs:
            for fil in p['filenames']:
                pattern = re.compile(f".*{fil.split('-')[0]}")
                newlist = [fil] + list(filter(pattern.match, p['filenames']))
                frappe.enqueue("tag_workflow.utils.bulk_upload_resume.upload_to_s3", queue='default', is_async=True, path=p['path'], newlist=newlist)
                frappe.enqueue("tag_workflow.utils.bulk_upload_resume.make_data", queue='default', is_async=True, path=p['path'], company=company, newlist=newlist)
        frappe.enqueue("tag_workflow.utils.bulk_upload_resume.remove_dir", queue='default', is_async=True, path=dest_os_path)
    except Exception as e:
        frappe.msgprint(e)

def remove_dir(path):
    try:
        shutil.rmtree(path)
    except Exception as e:
        frappe.log_error(e, "remove_dir")

def upload_to_s3(path, newlist):
    try:
        s3 = boto3.resource('s3')
        BUC = frappe.get_site_config().s3_bucket or ''
        for res in newlist:
            if(BUC):
                s3.Bucket(BUC).upload_file(path+"/"+res, res)
    except Exception as e:
        frappe.log_error(e,  "upload_to_s3")


#-----------------------#
def make_data(path, company, newlist):
    try:
        dates, name = [], []
        name = check_name(newlist)
        dates = check_file_and_get_dates(newlist)
        if name and dates:
            frappe.enqueue("tag_workflow.utils.bulk_upload_resume.update_emp_record", queue='default', is_async=True, path=path, emp_name=name, company=company, newlist=newlist, dates=dates)
    except Exception as e:
        frappe.log_error(e, "make_data")

#----------------#
def check_name(newlist):
    try:
        name = []
        check_email = re.compile(".*@")
        for res in newlist:
            if(list(filter(check_email.match, res))):
                data = res.split("_")[0]
            else:
                data = res.split(" - ")[0]

            if data not in name:
                name.append(data)
        return name
    except Exception as e:
        frappe.log_error(e, "checking name")
        return []

def check_file_and_get_dates(newlist):
    try:
        dates = []
        check_email = re.compile(".*@")
        for new in newlist:
            try:
                if(list(filter(check_email.match, new))):
                    data = new.split("_")[-1].split(".")[0]
                else:
                    data = new.split(" - ")[-1].split(".")[0]

                dte = datetime.datetime.strptime(data, "%Y-%m-%d %H-%M-%S")
                if dte not in dates:
                    dates.append(dte)
            except Exception:
                continue
        return dates
    except Exception as e:
        frappe.log_error(e, "file_error")
        return [], []


#-----------------------------------------------------#
def update_emp_record(path, emp_name, company, newlist, dates):
    try:
        if(len(emp_name) == 1 and len(emp_name[0].split(", ")) == 2):
            update_single_emps(path, company, emp_name, dates, newlist)
        else:
            update_multiple_emps(path, company, emp_name, dates, newlist)
    except Exception as e:
        frappe.log_error(e,  "update_emp_record")

def update_single_emps(path, company, emp_name, dates, newlist):
    try:
        print(path)
        name = emp_name[0].split(", ")[1] + " " + emp_name[0].split(", ")[0]
        dates.sort()
        employees = frappe.db.sql("""select name, employee_name from `tabEmployee` where employee_name like '{0}%' and company = '{1}' """.format(name, company), as_dict=1)
        for e in employees:
            for d in dates:
                if(len(dates) > 1):
                    try:
                        update_multiple(d, e.name, newlist)
                    except Exception:
                        continue
                else:
                    url = frappe.get_site_config().s3_url +"/"+ newlist[0]
                    frappe.db.set_value("Employee", e.name, "resume", url)
    except Exception as e:
        frappe.log_error(str(frappe.get_traceback()), "single emp update")

def update_multiple(date, emp, newlist):
    try:
        sql = 'insert into `tabEmployee Attachments` (name, attachments, parent, parentfield, parenttype, idx) values '
        count = 0
        is_value = 0
        for new in newlist:
            is_value = 1
            url = frappe.get_site_config().s3_url +"/"+ new
            if(new.find(str(date).replace(":", "-")) > 0):
                frappe.db.set_value("Employee", emp, "resume", url)
            sql += str(tuple([str(emp)+"-"+str(count), url, emp, "miscellaneous", "Employee", (count+1)])) + ","
            count += 1

        if(is_value > 0):
            frappe.db.sql(""" delete from `tabEmployee Attachments` where parent = %s """, emp)
            frappe.db.sql(sql[0:-1])
            frappe.db.commit()
    except Exception as e:
        frappe.log_error(e,  "update_multiple")

def update_multiple_emps(path, company, emp_name, dates, newlist):
    try:
        print(path, dates)
        for emp in emp_name:
            if(len(emp.split(", ")) == 2):
                try:
                    name = emp.split(", ")[1] + " " + emp.split(", ")[0]
                    employees = frappe.db.sql("""select name, employee_name from `tabEmployee` where employee_name like '{0}%' and company = '{1}' """.format(name, company), as_dict=1)
                    updatemultiple(employees, newlist)
                except Exception:
                    continue
    except Exceptio as e:
        frappe.log_error(e, "multiple emp update")

def updatemultiple(employees=None, newlist=None):
    try:
        for e in employees:
            for new in newlist:
                if(new.find(str(e)) > 0):
                    url = frappe.get_site_config().s3_url +"/"+ new
                    frappe.db.set_value("Employee", e.name, "resume", url)
    except Exception as e:
        frappe.log_error(e, "updatemultiple")


#----------------resume download-----------------------#
@frappe.whitelist()
def download_resume(resume):
    try:
        resume = resume.split("/")[-1]
        file_os_path = os.getcwd() + "/" + resume
        dest_os_path = os.getcwd() + "/" + frappe.get_site_path() + "/public/files/" + resume

        s3 = boto3.resource('s3')
        BUC = frappe.get_site_config().s3_bucket or ''
        if(BUC):
            my_bucket = s3.Bucket(BUC)
            for s3_object in my_bucket.objects.all():
                if(s3_object.key == resume):
                    my_bucket.download_file(s3_object.key, resume)
                    shutil.move(file_os_path, dest_os_path)
            return 1
        else:
            return "AWS S3 Bucket is not defined in config."
    except Exception as e:
        frappe.log_error(e,  "upload_to_s3")
        return str(e)
