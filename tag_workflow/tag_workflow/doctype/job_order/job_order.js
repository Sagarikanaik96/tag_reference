// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Job Order', {
	assign_employees: function(frm){
		if(frm.doc.__islocal != 1 && cur_frm.doc.owner != frappe.session.user && frm.doc.worker_filled < frm.doc.no_of_workers){
			if(cur_frm.is_dirty()){
				frappe.msgprint({message: __('Please save the form before creating Quotation'), title: __('Save Job Order'), indicator: 'red'});
			}else{
				assign_employe(frm);
			}
		}else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
			frappe.msgprint({message: __('No of workers already filled for this job order'), title: __('Worker Filled'), indicator: 'red'});
		}
	},
	onload:function(frm){
		check_company_detail(frm);
	},
	before_save:function(frm){
		check_company_detail(frm);
	},
	after_insert:function(frm){
		frappe.call({
			method:"tag_workflow.tag_data.staff_email_notification",
			args: {
				hiring_org:cur_frm.doc.company,
				job_order:cur_frm.doc.name,
				job_order_title:cur_frm.doc.job_title,
			},
		});
	}
});

/*-------check company details---------*/
function check_company_detail(frm){
	let roles = frappe.user_roles;
	if(roles.includes("Hiring User") || roles.includes("Hiring Admin")){
		var company_name = frappe.defaults.get_user_default("company");
		frappe.call({
			method:"tag_workflow.tag_data.company_details",
			args: {'company_name':company_name},
			callback:function(r){
				if(r.message!="success"){
					msgprint("You can't Create Job Order Unless Your Company Details are Complete");
					frappe.validated = false;
				}
			}
		});
	}
}
/*----------------prepare quote--------------*/
function assign_employe(frm){
	redirect_quotation(frm);
}

function redirect_quotation(frm){
	var doc = frappe.model.get_new_doc("Assign Employee");
	var staff_company = frappe.defaults.get_user_defaults("company") || [];
	doc.transaction_date = frappe.datetime.now_date();
	doc.staffing_organization = staff_company[0];
	doc.job_order = frm.doc.name;
	doc.no_of_employee_required = frm.doc.no_of_workers-frm.doc.worker_filled;
	doc.hiring_organization = frm.doc.company;
	frappe.set_route("Form", "Assign Employee", doc.name);
}
