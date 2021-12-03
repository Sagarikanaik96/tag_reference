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
		if(cur_frm.doc.__islocal==1){
			check_company_detail(frm);
			frm.set_df_property("time_remaining_for_make_edits", "options"," ");
		}  
	},
	refresh:function(frm){
		if(cur_frm.doc.__islocal==1){
			check_company_detail(frm);
		}
		else
		{
			timer_value(frm)	   
	}
	},
 
 
	before_save:function(frm){
		check_company_detail(frm);
	},
	after_save:function(frm){
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
	doc.job_category = frm.doc.select_job;
	doc.job_location = frm.doc.job_site;
	doc.job_order_email = frm.doc.owner;

	frappe.call({
		method:"tag_workflow.tag_data.staff_org_details",
		args: {
			company_details:frappe.defaults.get_user_defaults('Company')[0]
		},
		callback:function(r)
		{
			if(r.message=="failed"){
				msgprint("You can't Assign Employees Unless Your Company Details are Complete");
				frappe.validated = false;
			}
			else{
					frappe.set_route("Form", "Assign Employee", doc.name);
			}
		}
		})

}
 
function set_read_fields(frm){
	var myStringArray = ["phone_number","estimated_hours_per_day","address","e_signature_full_name","agree_to_contract","age_reqiured","per_hour","flat_rate","email"];
			var arrayLength = myStringArray.length;
			for (var i = 0; i < arrayLength; i++) {
				frm.set_df_property(myStringArray[i], "read_only", 1);
			}
 }
  
  
function timer_value(frm){
	var time=frappe.datetime.get_hour_diff(cur_frm.doc.posting_date_time,frappe.datetime.now_datetime())
	if(time<24)
		{
			var myStringArray = ["company","posting_date_time","order_status","resumes_required","require_staff_to_wear_face_mask","select_job","job_title","job_site","no_of_workers","job_duration","extra_price_increase","extra_notes","drug_screen","background_check","driving_record","shovel","phone_number","estimated_hours_per_day","address","e_signature_full_name","agree_to_contract","age_reqiured","per_hour","flat_rate","email"];
			var arrayLength = myStringArray.length;
			for (var i = 0; i < arrayLength; i++) {
				frm.set_df_property(myStringArray[i], "read_only", 1);
			}
			frm.set_df_property("time_remaining_for_make_edits", "options"," ");
		}
	else
		{
			set_read_fields(frm)
			time_value(frm)
			setTimeout(function()
			{
				time_value(frm)
				cur_frm.refresh()
			},60000);  
		}
 	}
function time_value(frm){
	var entry_datetime = frappe.datetime.now_datetime().split(" ")[1];
	var exit_datetime = cur_frm.doc.posting_date_time.split(" ")[1];
	var splitEntryDatetime= entry_datetime.split(':');
	var splitExitDatetime= exit_datetime.split(':');
	var totalMinsOfEntry= splitEntryDatetime[0] * 60 + parseInt(splitEntryDatetime[1]) + splitEntryDatetime[0] / 60;
	var totalMinsOfExit= splitExitDatetime[0] * 60 + parseInt(splitExitDatetime[1]) + splitExitDatetime[0] / 60;
	var entry_date = new Date(frappe.datetime.now_datetime().split(" ")[0]);
	var exit_date = new Date(cur_frm.doc.posting_date_time.split(" ")[0]);
	var diffTime = Math.abs(exit_date - entry_date);
	var diffDays = Math.ceil(diffTime/ (1000 * 60 * 60 * 24));
	var x=parseInt(((diffDays*(24*60)) +totalMinsOfExit) - totalMinsOfEntry)
	let data1= Math.floor(x/24/60)-1 + " Days:" + Math.floor(x/60%24) + ' Hours:' + x%60+' Minutes'
	let data = `
			<p><b>Time Remaining for Make Edits: </b> ${[data1]}</p>
		`;
	frm.set_df_property("time_remaining_for_make_edits", "options",data);
 }
 