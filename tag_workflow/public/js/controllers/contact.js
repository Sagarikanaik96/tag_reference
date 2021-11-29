frappe.ui.form.on("Contact", {
	refresh: function(frm){
		init_fields(frm);
		make_field_mandatory(frm);
	}
});

/*---------hide field------------*/
function init_fields(frm){
	var contact_field = ["middle_name","last_name","email_id","user","sync_with_google_contacts","status","salutation","designation","gender","image", "sb_00","sb_01","contact_details","more_info"];

	for(var field in contact_field){
		cur_frm.toggle_display(contact_field[field], 0);
	}
}

/*--------mandatory field------------*/
function make_field_mandatory(frm){
	let reqd = ["company_name", "phone_number", "email_address"];
	for(let r in reqd){
		cur_frm.toggle_reqd(reqd[r], 1);
	}
}


frappe.listview_settings['Contact'] = {
	onload: function(listview) {
			frappe.route_options = {
				"owner": ["=", frappe.session.user]
			};
		
	}
};
