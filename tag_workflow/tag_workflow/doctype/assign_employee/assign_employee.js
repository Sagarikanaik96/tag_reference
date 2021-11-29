// // Copyright (c) 2021, SourceFuse and contributors
// // For license information, please see license.txt

 
frappe.ui.form.on('Assign Employee', {
	tag_status: function(frm) {
		make_hiring_notification(frm);
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
