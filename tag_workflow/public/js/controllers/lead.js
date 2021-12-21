frappe.ui.form.on("Lead", {
	refresh: function(frm){
		reqd_fields(frm);
		hide_fields(frm);
		let roles = frappe.user_roles;
		if(frm.doc.status == "Close" && (roles.includes("Tag Admin") || roles.includes("Tag User") || roles.includes("Staffing Admin") || roles.includes("Staffing User"))){
			onboard_org(frm);
		}
	}
});

/*------hide-----*/
function hide_fields(frm){
	let fields = ["organization_lead"];
	for(let f in fields){
		cur_frm.toggle_display(fields[f], 0);
	}
}

/*-------reqd------*/
function reqd_fields(frm){
	let reqd = ["lead_name", "company_name", "email_id"];
	for(let r in reqd){
		cur_frm.toggle_reqd(reqd[r], 1);
	}
}

/*------------onboard----------------*/
function onboard_org(frm){
	var email = frm.doc.email_id;
	var exclusive = frm.doc.company_name;
	var person_name = frm.doc.lead_name;

	frappe.db.get_value("User", {"name": frappe.session.user}, "company", function(r){
		if(r && r.company){
			frm.add_custom_button("Onboard Organization", function() {
				(check_dirty(frm)) ? onboard_orgs(exclusive, r.company, email, person_name) : console.log("TAG");
			}).addClass("btn-primary");
		}	
	});
}

function check_dirty(frm){
	let is_ok = true;
	if(cur_frm.is_dirty() == 1){
		frappe.msgprint("Please save the form before Onboard Organization");
		is_ok = false;
	}
	return is_ok;
}

/*-------onboard----------*/
function onboard_orgs(exclusive, staffing, email, person_name){
	if(exclusive && email){
		frappe.call({
			"method": "tag_workflow.controllers.crm_controller.onboard_org",
			"freeze": true,
			"freeze_message": "<p><b>Please wait while we are preparing Organization for onboarding</b></p>",
			"args": {"exclusive": exclusive, "staffing": staffing, "email": email, "person_name": person_name},
			"callback": function(r){
				console.log(r);
			}
		});
	}else{
		(!exclusive) ? cur_frm.scroll_to_field("company_name") : cur_frm.scroll_to_field("email_id");
		frappe.msgprint({message: __('<b>Organization Name</b> and <b>Email Address</b> is required for Onboarding'), title: __('Warning'), indicator: 'red'});
	}
}
