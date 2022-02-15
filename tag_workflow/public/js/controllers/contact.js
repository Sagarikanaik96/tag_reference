frappe.ui.form.on("Contact", {
	refresh: function(frm){
		$('.form-footer').hide()
		$('[data-original-title="Menu"]').hide()
		init_fields(frm);
		make_field_mandatory(frm);
		if(frm.doc.__islocal==1){
			cancel_cantact(frm);
		}
	},
	onload: function (frm) {
		if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
			cur_frm.fields_dict["company"].get_query = function (doc) {
				return {
					query: "tag_workflow.tag_data.contact_company",
					filters: {
						company: frappe.defaults.get_user_default("Company"),
					},
				};
			};
		}
	},
	before_save:function(frm){
		let name = frm.doc.first_name
		let company = frm.doc.company_name
		let email = frm.doc.email_address
		let zip = frm.doc.zip
		let phone = frm.doc.phone_number
		let is_valid = 1;
		if (name && name.length  > 120){
			frappe.msgprint({message: __('Name length exceeds'), indicator: 'red'})
			is_valid = 0
		}
		if (company && company.lenght > 120){
			frappe.msgprint({message: __('Company lenght exceeds'), indicator: 'red'})
			is_valid = 0
		}
		if (email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))){
			frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'})
			is_valid = 0
		}
		if (zip && (zip.length !=5 || isNaN(zip))){
			frappe.msgprint({message: __('Not Valid Zip'), indicator: 'red'})
			is_valid = 0
		}
		if (phone && (phone.length != 10 || isNaN(phone))){
			frappe.msgprint({message: __('Not Valid phone number'), indicator: 'red'})
			is_valid = 0
		}
		if (is_valid == 0){
			frappe.validated = false
		}
	}
});


/*---------hide field------------*/
function init_fields(frm){
	var contact_field = ["middle_name","last_name","email_id","user","sync_with_google_contacts","status","salutation","designation","gender","image", "sb_00","sb_01","contact_details","more_info","company_name"];

	for(var field in contact_field){
		cur_frm.toggle_display(contact_field[field], 0);
	}
}

/*--------mandatory field------------*/
function make_field_mandatory(frm){
	let reqd = ["company", "phone_number", "email_address"];
	for(let r in reqd){
		cur_frm.toggle_reqd(reqd[r], 1);
	}
}

function cancel_cantact(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "User");
	});
}