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
		check_employee_data(frm);
	}
});

/*-----------hiring notification--------------*/
function make_hiring_notification(frm){
	let state = cur_frm.doc.tag_status;
	if(state == "Approval Request"){
		frappe.call({
			"method":"tag_workflow.tag_data.receive_hiring_notification",
			"freeze": true,
			"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
			"args":{
				"hiring_org" : cur_frm.doc.hiring_organization, "job_order" : cur_frm.doc.job_order,
				"staffing_org" : cur_frm.doc.company, "emp_detail" : cur_frm.doc.employee_details, "doc_name" : cur_frm.doc.name
			}
		});
	}else if(state == "Approved"){
		frappe.call({
			method:"tag_workflow.tag_data.update_job_order",
			"freeze": true,
			"freeze_message": "<p><b>preparing notification for Staffing orgs...</b></p>",
			args:{
				"job_name" : cur_frm.doc.job_order, "employee_filled" : cur_frm.doc.employee_details.length,
				"staffing_org" : cur_frm.doc.company, "hiringorg" : cur_frm.doc.hiring_organization, "name": frm.doc.name
			}
		});
	}
}

/*---------employee data--------------*/
function check_employee_data(frm){
	let msg = [];
	let table = frm.doc.employee_details || [];
	let employees = [];

	for(var d in table){
		if(table[d].job_category != frm.doc.job_category){
			msg.push('Employee(<b>'+table[d]/employee+'</b>) job category not matched with Job Order job category');
		}
	}

	(table.length > Number(frm.doc.no_of_employee_required)) ? msg.push('Employee Details(<b>'+table.length+'</b>) value is more then No. Of Employee Required(<b>'+frm.doc.no_of_employee_required+'</b>) for the Job Order(<b>'+frm.doc.job_order+'</b>)') : console.log("TAG");

	for(var e in table){(!employees.includes(table[e].employee)) ? employees.push(table[e].employee) : msg.push('Employee <b>'+table[e].employee+' </b>appears multiple time in Employee Details');}

	if(msg.length){frappe.msgprint({message: msg.join("\n\n"), title: __('Warning'), indicator: 'red'});frappe.validated = false;}
}
