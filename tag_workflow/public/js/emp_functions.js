/*---------For Employee and Employee Onboarding Forms----------*/
/*--------------------Address Field Updates--------------------*/
function show_addr(frm){
	if(frm.doc.search_on_maps){
		frm.get_docfield('street_address').label = 'Complete Address';
	}else if(frm.doc.enter_manually){
		frm.get_docfield('street_address').label = 'Street Address';
	}
    if(frm.doc.enter_manually == 1){
        frm.toggle_display("complete_address", 0);
    }else{
        frm.toggle_display("complete_address", 1);
    }
	frm.refresh_field('street_address');
}

/*--------------------Update Complete Address---------------------*/
function update_complete_address(frm){
	if(frm.doc.zip && frm.doc.state && frm.doc.city){
	    let data = {
	        street_number: frm.doc.street_address ? frm.doc.street_address : '',
	        route: frm.doc.suite_or_apartment_no ? frm.doc.suite_or_apartment_no : '',
	        locality: frm.doc.city,
	        administrative_area_level_1 : frm.doc.state,
	        postal_code : frm.doc.zip ? frm.doc.zip : 0,
	    };
		update_comp_address(frm,data);
	}
	else{
	    frm.set_value('complete_address','');
    }
}

function update_comp_address(frm,data){
	frappe.call({
	    method:'tag_workflow.tag_data.update_complete_address',
	    args:{
	        data:data
	    },
	    callback:function(r){
	        if(r.message!='No Data')
	        {
	            if(r.message!=frm.doc.complete_address){
	                frm.set_value('complete_address',r.message);
	            }
	        }
	        else{
	            frm.set_value('complete_address','');
	        }
	    }
	});
}

function show_fields(frm){
	frm.set_df_property('city','hidden',0);
	frm.set_df_property('state','hidden',0);
	frm.set_df_property('zip','hidden',0);
}

function remove_lat_lng(frm){
	if((frm.doc.enter_manually) && (!frm.doc.zip && !frm.doc.city && !frm.doc.state) && (frm.doc.lat || frm.doc.lng)){
		frm.set_value('complete_address',undefined);
		set_lat_lng_undefined(frm);

	}
	else if((frm.doc.search_on_maps) && (!frm.doc.complete_address) && (frm.doc.lat || frm.doc.lng)){
		frm.set_value('state',undefined);
		frm.set_value('city',undefined);
		frm.set_value('zip',undefined);
		set_lat_lng_undefined(frm);
	}
}

function set_lat_lng_undefined(frm){
	frm.set_value('suite_or_apartment_no',undefined);
	frm.set_value('street_address',undefined);
	frm.set_value('lat',undefined);
	frm.set_value('lng',undefined);
}

function update_lat_lng(frm){
	if((frm.doc.enter_manually) && (frm.doc.zip && frm.doc.city && frm.doc.state)){
		frappe.call({
			method:"tag_workflow.tag_data.set_lat_lng",
			args:{
				'form_name':frm.doc.name,
			}
		});
	}
}

/*---------------First Letter Uppercase------------------*/
function name_update(string){
	return string.charAt(0).toUpperCase() + string.slice(1);
}

/*-----------------Validate Phone and Zip----------------*/
function validate_phone_zip(frm){
	let contact_number = frm.doc.contact_number;
	let zip = frm.doc.zip;
	if(contact_number){
		if(!validate_phone(contact_number)){
			frappe.msgprint({message: __("Invalid Contact Number!"),indicator: "red"});
			frappe.validated = false;
		}
		else{
			frm.set_value('contact_number', validate_phone(contact_number));
		}
	}
	if (zip){
		frm.set_value('zip', zip.toUpperCase());
		if(!validate_zip(zip)){
			frappe.msgprint({message: __("Invalid Zip!"),indicator: "red"});
			frappe.validated = false;
		}
	}
}

function mandatory_fields(fields){
	let message = "<b>Please Fill Mandatory Fields:</b>";
	for (let key in fields) {
		if (fields[key] === undefined || !fields[key]) {
			message = message + "<br>" + "<span>&bull;</span>" + key;
		}
	}
	if (message != "<b>Please Fill Mandatory Fields:</b>") {
		frappe.msgprint({ message: __(message), title: __("Missing Fields"), indicator: "orange", });
		frappe.validated = false;
	}
}

/*----For Employee Onboarding and Employee Onboarding Template Forms----*/
function check_count(frm, cdt, cdn){
	let row = locals[cdt][cdn];
	if(row.document){
		let doc_count = count_doc(frm);
		if(doc_count[row.document]>1){
			frappe.msgprint(__('You can attach ' + row.document + ' only once.'));
			frappe.model.set_value(cdt, cdn, 'document', '');
			frm.refresh_field('activities');
		}
	}
}

function document_required(frm, cdt, cdn){
	let row = locals[cdt][cdn];
	if(row.document_required == 0){
		frappe.model.set_value(cdt, cdn, 'document', '');
		frappe.model.set_value(cdt, cdn, 'attach', '');
		frm.refresh_field('activities');
	}
}

function document_field(frm, cdt, cdn){
	frappe.model.set_value(cdt, cdn, 'attach', '');
	frm.refresh_field('activities');

	let row = locals[cdt][cdn];
	if(row.document){
		let doc_count = count_doc(frm);
		if(doc_count[row.document]>1){
			frappe.msgprint(__('You can attach ' + row.document + ' only once.'));
			frappe.model.set_value(cdt, cdn, 'document', '');
			frm.refresh_field('activities');
		}
	}
}

function count_doc(frm){
	let table_data = frm.doc.activities;
	let doc_counts = {};
	table_data.forEach((x) => {
		if(x.document && ['Resume','W4','E verify', 'New Hire Paperwork', 'I9'].includes(x.document)){
			doc_counts[x.document] = (doc_counts[x.document] || 0) + 1; 
		}
	});
	return doc_counts;
}
