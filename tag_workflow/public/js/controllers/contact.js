frappe.ui.form.on("Contact", {
	refresh: function(frm){
		init_fields(frm);
	}
});

/*---------hide field------------*/
function init_fields(frm){
	var contact_field = ["middle_name","last_name","email_id","user","sync_with_google_contacts","status","salutation","designation","gender","image", "sb_00","sb_01","contact_details","more_info"];

	for(var field in contact_field){
		cur_frm.toggle_display(contact_field[field], 0);
	}
}
