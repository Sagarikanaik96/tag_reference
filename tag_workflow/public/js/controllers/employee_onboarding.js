frappe.require('/assets/tag_workflow/js/twilio_utils.js');
frappe.require('/assets/tag_workflow/js/emp_functions.js');
frappe.ui.form.on('Employee Onboarding', {
	setup: (frm)=>{
		frm.set_query("company", function(){
			return {
				filters: [
					['Company', 'organization_type', '=', 'Staffing'],
					['Company','make_organization_inactive','=',0]
				]
			}
		});
	},
    onload: (frm)=>{
        trigger_hide(frm);
		if(frm.is_new()){
			frm.set_value('status', 'Pending');
		}
		setTimeout(()=>{
			$('[data-label = "View"]').hide();
		},250);
    },
    refresh: (frm)=>{
		$('.form-footer').hide();
        setTimeout(()=>{
			$('[data-label = "View"]').hide();
		},250);
        set_map(frm);
		show_addr(frm);
		hide_field(frm);
        $('.form-control[data-fieldname="ssn"]').css('-webkit-text-security', 'disc');
        $('[data-fieldname= "ssn"]').attr('title', '');
		$('[data-fieldname = "contact_number"]>div>div>div>input').attr("placeholder", "Example: +XX XXX-XXX-XXXX");
    },
	onload_post_render: (frm)=>{
		if(frm.doc.search_on_maps){
			setTimeout(()=>{
				$('.frappe-control[data-fieldname="map"]').removeClass('hide-control');
			},1000);
		}
	},
	validate: (frm)=>{
		let reqd_fields = {"First Name": frm.doc.first_name, "Last Name": frm.doc.last_name, "Email": frm.doc.email, "Date Of Birth": frm.doc.date_of_birth};
		mandatory_fields(reqd_fields);
		validate_phone_zip(frm);
		if(frm.doc.ssn && frm.doc.ssn.toString().length != 9) {
			frm.set_value("ssn", "");
			frappe.msgprint(__("Minimum and Maximum Characters allowed for SSN are 9."));
			frappe.validated = false;
		}

		let email = frm.doc.email;
		if(email && email!=undefined && (email.length > 120 || !frappe.utils.validate_type(email, "email"))){
			frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'});
			frappe.validated = false;
		}

		if(frm.doc.first_name && frm.doc.last_name){
			frm.set_value('employee_name',(frm.doc.first_name).trim()+' '+(frm.doc.last_name).trim());
		}

		if(frm.doc.__islocal == 1 && frappe.validated){
			create_job_applicant_and_offer(frm);
		}
	},
	before_save: (frm) => {
		if(frm.doc.status){
			frm.set_value('boarding_status', frm.doc.status)
		}
		if(frm.doc.ssn){
			if(frm.doc.ssn=='•••••••••'){
				frm.set_value('ssn','•••••••••');
			}
			else if(isNaN(parseInt(frm.doc.ssn))){
				frappe.msgprint(__("Only numbers are allowed in SSN."));
				frm.set_value("ssn", "");
				frappe.validated = false;
			}
			else{
				frm.set_value('ssn','•••••••••');
			}
		}
		else if (frm.doc.ssn && frm.doc.ssn.toString().length != 9) {
			frm.set_value("ssn", "");
			frappe.msgprint(__("Minimum and Maximum Characters allowed for SSN are 9."));
			frappe.validated = false;
		}
		else{
			frm.set_value("ssn", "");
		}
		remove_lat_lng(frm);
	},
    after_save: (frm)=>{
		update_lat_lng(frm);
	},
	first_name: (frm)=>{
		if(frm.doc.first_name){
			let first_name = (frm.doc.first_name).trim();
			first_name = name_update(first_name);
			frm.set_value("first_name",first_name);
		}
	},		
	last_name: (frm)=>{
		if(frm.doc.last_name){
			let last_name = (frm.doc.last_name).trim();
			last_name = name_update(last_name);
			frm.set_value("last_name",last_name);
		}
	},
	contact_number: (frm)=>{
		let contact = frm.doc.contact_number;
		if(contact){
			frm.set_value('contact_number', validate_phone(contact) ? validate_phone(contact) : contact);
		}
	},
	date_of_birth: (frm)=>{
		let dob = frm.doc.date_of_birth || "";
		if(dob && dob >= frappe.datetime.now_date()){
			frappe.msgprint({message: __("<b>Date of Birth</b> cannot be Today's date or Future date."), title: __('Error'), indicator: 'orange'});
			frm.set_value('date_of_birth', '');
		}
	},
	search_on_maps: (frm)=>{
		if(frm.doc.search_on_maps == 1){
			tag_workflow.UpdateField(frm, "map");
			hide_field(frm);
			show_addr(frm);
			update_complete_address(frm);
		}else if(frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			frm.set_df_property('map','hidden',1);
            show_addr(frm);
		}
	},
	enter_manually: (frm)=>{
		if(frm.doc.enter_manually == 1){
			tag_workflow.UpdateField(frm, "manually");
			show_fields(frm);
			show_addr(frm);
		}else if(frm.doc.search_on_maps ==0 && frm.doc.enter_manually==0){
			frm.set_df_property('map','hidden',1);
			hide_field(frm);
            show_addr(frm);
		}
	},
	zip: (frm)=>{
		let zip = frm.doc.zip;
		frm.set_value('zip', zip ? zip.toUpperCase() : zip);
	}
});

function trigger_hide(frm){
	$('.form-footer').hide();
	let fields = ['job_applicant','job_offer','employee_name','project', 'department', 'designation', 'employee_grade'];
	for(let i in fields){
		frm.set_df_property(fields[i], 'hidden', 1);
	}
}

const html=`<!doctype html>
	<html>
		<head>
			<meta charset="utf-8">
		</head>
		<body>
			<input class="form-control" placeholder="Search a location" id="autocomplete-address" style="height: 30px;margin-bottom: 15px;">
			<div class="tab-content" title="map" style="text-align: center;padding: 4px;">
				<div id="map" style="height:450px;border-radius: var(--border-radius-md);"></div>
			</div>
		</body>
	</html>
`;

function set_map (frm) {
	setTimeout(()=>{
		$(frm.fields_dict.map.wrapper).html(html);
		initMap();
	}, 500);
	if((frm.doc.search_on_maps == 0 && frm.doc.enter_manually ==0)||frm.doc.enter_manually == 1 || frm.is_new()){
		frm.set_df_property('map', 'hidden', 1);
	}
}

function hide_field(frm){
	frm.set_df_property('city','hidden',frm.doc.city && frm.doc.enter_manually ==1 ? 0:1);
	frm.set_df_property('state','hidden', frm.doc.state && frm.doc.enter_manually ==1 ? 0:1);
	frm.set_df_property('zip','hidden',frm.doc.zip && frm.doc.enter_manually ==1 ? 0:1);
}

function create_job_applicant_and_offer(frm){
	let args = {
		applicant_name: frm.doc.employee_name,
		email: frm.doc.email,
		company: frm.doc.company
	}
	if(frm.doc.contact_number){
		args.contact_number = frm.doc.contact_number;
	}
	frappe.call({
		method: "tag_workflow.tag_data.create_job_applicant_and_offer",
		args: args,
		callback: (r)=>{
			if(r.message){
				frm.set_value('job_applicant', r.message[0]);
				frm.set_value('job_offer', r.message[1]);
			}
			else{
				frappe.validated = false;
			}
		}
	});
}

frappe.ui.form.on('Employee Boarding Activity', {
	form_render: (frm, cdt, cdn)=>{
		check_count(frm, cdt, cdn);
	},
	document_required: (frm, cdt, cdn)=>{
		document_required(frm, cdt, cdn);
	},
	document: (frm, cdt, cdn)=>{
		document_field(frm, cdt, cdn);
	}
});
