// // Copyright (c) 2021, SourceFuse and contributors
// // For license information, please see license.txt

 
frappe.ui.form.on('Assign Employee', {
	tag_status: function(frm) {
		make_hiring_notification(frm);
	},
	onload:function(frm){
		cur_frm.fields_dict['employee_details'].grid.get_field('employee').get_query = function(doc, cdt, cdn) {
			return {
				filters:[
					['company', '=', frappe.defaults.get_user_default("company")],
					['job_category', '=' , cur_frm.doc.job_category]
				]
			}
		}
	},
	before_save:function(frm){
		frappe.call({
			method:"tag_workflow.tag_data.check_assign_employee",
			args:{
				total_employee_required:frm.doc.no_of_employee_required,
				employee_detail:frm.doc.employee_details
			},
			callback:function(r){
				console.log(r);
				if (r.message == 'exceeds'){
					msgprint("No of Employee Exceeds as per Requirements")
					frappe.validated = false;
				}
				else if (r.message == 'duplicate'){
					msgprint(" Duplicate Employee Entry")
					frappe.validated = false;
				}
				else if(r.message == 'insert'){
					msgprint("please Insert employee")
					frappe.validated = false;
				}
				/*else if(r.message == 0){
					msgprint('Something Went Wrong PLease Try again')
					frappe.validated = false;
				}*/
			}
		})
	}
});

/*-----------hiring notification--------------*/
function make_hiring_notification(frm){
	let state = cur_frm.doc.tag_status;
	console.log(state);
	if(state == "Approval Request"){
		frappe.call({
			method:"tag_workflow.tag_data.receive_hiring_notification",
			args:{
				hiring_org:cur_frm.doc.hiring_organization,
				job_order:cur_frm.doc.job_order,
				staffing_org:cur_frm.doc.staffing_organization,
				emp_detail:cur_frm.doc.employee_details,
				doc_name :cur_frm.doc.name
			},
		});
	}else if(state == "Approved"){
		frappe.call({
			method:"tag_workflow.tag_data.update_job_order",
			args:{
				job_name:cur_frm.doc.job_order,
				employee_filled:cur_frm.doc.employee_details.length,
				staffing_org:cur_frm.doc.staffing_organization,
				hiringorg:cur_frm.doc.hiring_organization
			},
		});
	}
}
