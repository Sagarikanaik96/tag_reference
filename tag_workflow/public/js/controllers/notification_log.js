// Copyright (c) 2019, Frappe Technologies and contributors
// For license information, please see license.txt

frappe.ui.form.on('Notification Log', {
	open_reference_document: function(frm) {
		const dt = frm.doc.document_type;
		const dn = frm.doc.document_name;
        if(frappe.user_roles.includes("Staffing Admin") || frappe.user_roles.includes("Staffing User")){
			if(dt == 'Timesheet'){
				frappe.db.get_value("Timesheet", { name: dn},"job_order_detail", function(r1){
					let job_order = r1.job_order_detail;
					localStorage.setItem("order", job_order);
					window.location.href = "/app/timesheet-approval";
				})
			}

        }
        else{
            frappe.set_route('Form', dt, dn);
        }
		
	}
});
