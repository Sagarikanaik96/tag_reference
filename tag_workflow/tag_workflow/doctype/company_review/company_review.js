// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Company Review', {
	refresh: function() {
		staffing_review();
		$('.form-footer').hide();
	}
});

function staffing_review(){
    if (["Hiring", "Exclusive Hiring"].includes(frappe.boot.tag.tag_user_info.company_type)){
        frappe.msgprint("You don't have enough permissions.");
        frappe.set_route("app");
    }
}
