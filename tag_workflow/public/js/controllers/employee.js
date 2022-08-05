frappe.require('/assets/tag_workflow/js/twilio_utils.js');
frappe.ui.form.on("Employee", {
	refresh: function(frm){
		$('.form-footer').hide();
		$('[class="btn btn-primary btn-sm primary-action"]').show();
		$('.custom-actions.hidden-xs.hidden-md').show();
		update_employees_data(frm);
		trigger_hide();
		required_field();
		employee_work_history(frm)
		download_document(frm)
		cur_frm.dashboard.hide()
		uploaded_file_format(frm);
		if (frm.doc.__islocal == 1) {
			cancel_employee(frm);
			tag_company(frm);
		  }
		employee_delete_button(frm);
		employee_delete_button(frm);
		set_map(frm);
		hide_field(frm);
		show_addr(frm);
		$('.form-control[data-fieldname="sssn"]').css('-webkit-text-security', 'disc');
		$('*[data-fieldname="block_from"]').find('.grid-add-row')[0].addEventListener("click",function(){
			const li = []
			frm.doc.block_from.forEach(element=>{
			li.push(element.blocked_from)
			})
			frappe.call({
				"method": "tag_workflow.utils.whitelisted.get_orgs",
				"args":{
					company:frappe.boot.tag.tag_user_info.company,
					employee_lis:li
				},
				"callback": function(r){
					if(r){

						frm.fields_dict.block_from.grid.update_docfield_property(
						'blocked_from',
						'options',
						[''].concat(r.message)
						);
						}
				}
			});
		});

		hide_decrpt_ssn(frm);

		window.onclick = function() {
			attachrefresh();
		}
		
		$('*[data-fieldname="miscellaneous"]').find('.grid-add-row')[0].addEventListener("click",function(){
			attachrefresh();
		});

		$("[data-fieldname=miscellaneous]").mouseover(function(){
			attachrefresh();
		});

		$('*[data-fieldname="background_check_or_drug_screen"]').find('.grid-add-row')[0].addEventListener("click",function(){
			attachrefresh();
		});

		$("[data-fieldname=background_check_or_drug_screen]").mouseover(function(){
			attachrefresh();
		});

		$('*[data-fieldname="id_requirements"]').find('.grid-add-row')[0].addEventListener("click",function(){
			attachrefresh();
		});

		$("[data-fieldname=id_requirements]").mouseover(function(){
			attachrefresh();
		});

		$('*[data-fieldname="direct_deposit_letter"]').find('.grid-add-row')[0].addEventListener("click",function(){
			attachrefresh();
		});

		$("[data-fieldname=direct_deposit_letter]").mouseover(function(){
			attachrefresh();
		});

		attachrefresh();

		$(document).on('click', '[data-fieldname="company"]', function(){
			setTimeout(()=>{
				$('[data-fieldname="company"]').find('.link-btn').addClass("hide");
		
			},300);
		});

		$('[data-fieldname="company"]').mouseover(function(){
			setTimeout(()=>{
				$('[data-fieldname="company"]').find('.link-btn').addClass("hide");
		
			},500);
		});

	  	document.addEventListener("keydown", function(){
			setTimeout(()=>{
				$('[data-fieldname="company"]').find('.link-btn').addClass("hide");
		
			},400);
		});

		$('[data-fieldname="company"]').click(function(){
			if(cur_frm.doc.__islocal !==1){
				setTimeout(()=>{
					let cust= cur_frm.fields_dict.company.value
					localStorage.setItem("company", cust)
					window.location.href= "/app/dynamic_page"
				},600);
			}
		});


		$(document).on('click', '[data-fieldtype="Attach"]', function(){
			setTimeout(() => {
				document.getElementsByClassName("modal-title")[0].innerHTML='Upload <h6>(Accepted File Type : pdf, txt or docx ,png ,jpg only, file size 10mb) </h6>'
  			}, 300)
		});


		$(document).on('click', '[data-fieldname="company"]', function(){
			companyhide(1250);
		});

		$('[data-fieldname="company"]').mouseover(function(){
			companyhide(300);
		});

	  	document.addEventListener("keydown", function(){
			companyhide(300);
		});


		$(document).on('click', '[data-fieldname="resume"]', function(){
			filerestriction()
		});

		$(document).on('click', '[data-fieldname="w4"]', function(){
			filerestriction()
		});


		$(document).on('click', '[data-fieldname="miscellaneous"]', function(){
			filerestriction()
		});

		let child_table = ['job_category','blocked_from', 'no_show_company', 'job_order', 'date', 'unsatisfied_organization_name', 'dnr', 'id_requirements', 'direct_deposit_letter', 'drug_screen', 'attachments'];
		for(let i in child_table){
			$( "[data-fieldname="+child_table[i]+"]" ).on('mouseover',function(e) {
				let file=e.target.innerText;
				$(this).attr('title', file);
			});
		}
		$('[data-fieldname= "ssn"]').attr('title', '');
		$('[data-fieldname = "contact_number"]>div>div>div>input').attr("placeholder", "Example: +XX XXX-XXX-XXXX");
	},


	decrypt_ssn: function(frm) {
		frappe.call({
			method: "tag_workflow.tag_data.api_sec",
			args: {
				'frm': frm.doc.name,
			},
			callback: function(r) {
				frm.set_value('decrypted_ssn', r.message);
				refresh_field('decrypted_ssn');
			}
		})
	},

	resume:function(frm){
		if (frm.doc.resume && !hasExtensions(frm.doc.resume, [".pdf", ".txt", ".docx",'.png','jpg'])){
			let array = frm.doc.resume.split("/")
			let file_name = array[array.length -1]
			frappe.call({
				method:"tag_workflow.tag_data.delete_file_data",
				args:{file_name:file_name}
			});

			frm.set_value('resume', '');
			refresh_field('resume');
			frappe.msgprint("Upload Wrong File type in Resume");
		}
	},

	validate:function(frm){
		validate_phone_zip(frm);
		if (frm.doc.sssn && frm.doc.sssn.toString().length != 9) {
			frm.set_value("ssn", "");
			frm.set_value("sssn", "");
			frappe.msgprint(__("Minimum and Maximum Characters allowed for SSN are 9."));
			frappe.validated = false;
		}

		let email = frm.doc.email
		if(email.length > 120 || !frappe.utils.validate_type(email, "email")){
			frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'});
			frappe.validated = false
		}
		
		if((frm.doc.employee_job_category) && (frm.doc.employee_job_category.length)>0){
			frm.set_value("job_category",frm.doc.employee_job_category[0]["job_category"]);
		}else{
			frm.set_value("job_category",null);
		} 
		append_job_category(frm)
	},

	ssn: function(frm){
		if(frm.doc.ssn && isNaN(frm.doc.ssn)){
			frappe.msgprint(__("Only numbers are allowed in SSN."));
			frm.set_value("ssn", "");
		}
	},

	before_save:function (frm) {
		frm.doc.decrypt_ssn = 0;
		if(frm.doc.sssn){
			if(frm.doc.sssn=='•••••••••'){
				frm.set_value('sssn','•••••••••')
			}
			else if(isNaN(parseInt(frm.doc.sssn))){
				frappe.msgprint(__("Only numbers are allowed in SSN."));
				frm.set_value("ssn", "");
				frm.set_value("sssn", "");
				frm.doc.decrypt_ssn = 0;

				frappe.validated = false
			}
			else{
				frm.set_value('ssn',cur_frm.doc.sssn)
				frm.set_value('sssn','•••••••••')
			}
		}
		else if (frm.doc.sssn && frm.doc.sssn.toString().length != 9) {
			frm.set_value("ssn", "");
			frm.set_value("sssn", "");
			frappe.msgprint(__("Minimum and Maximum Characters allowed for SSN are 9."));
			frappe.validated = false;
		}
		else{
			frm.set_value("ssn", "");
			frm.set_value("sssn", "");

		}
		remove_lat_lng(frm)
		job_title_filter(frm);
	},
	setup:function(frm){
		frm.set_query("company", function() {
			return {
				"filters":[ ['Company', "organization_type", "in", ["Staffing" ]],['Company',"make_organization_inactive","=",0]]
			}
		});

	},
	after_save:function(frm){
		update_lat_lng(frm)
	},


	search_on_maps: function(frm){
		if(cur_frm.doc.search_on_maps == 1){
			tag_workflow.UpdateField(frm, "map");
			hide_field(frm);
			show_addr(frm);
			update_complete_address(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			cur_frm.set_df_property('map','hidden',1);
            show_addr(frm);
		}
	},

	enter_manually: function(frm){
		if(cur_frm.doc.enter_manually == 1){
			tag_workflow.UpdateField(frm, "manually");
			show_fields(frm);
			show_addr(frm)
		}else if(cur_frm.doc.search_on_maps ==0 && cur_frm.doc.enter_manually==0){
			cur_frm.set_df_property('map','hidden',1);
			hide_field(frm);
            show_addr(frm);
		}
	},
	onload_post_render:function(frm){
		if(frm.doc.search_on_maps){
			setTimeout(()=>{
				$('.frappe-control[data-fieldname="map"]').removeClass('hide-control')
			},1000)
		}
	},
	contact_number: function(frm){
		let contact = frm.doc.contact_number;
		if(contact){
			frm.set_value('contact_number', validate_phone(contact)?validate_phone(contact):contact);
		}
	},
	zip: function(frm){
		let zip = frm.doc.zip;
		frm.set_value('zip', zip?zip.toUpperCase():zip);
	}
});

frappe.ui.form.on('Job Category', {
	job_category(frm) {
		append_job_category(frm)
	},
	employee_job_category_remove(frm){
	    append_job_category(frm)
	}
})

function hasExtensions(filename, exts){
	return new RegExp("(" + exts.join("|").replace(/\./g, '\\.') + ')$').test(filename);
}

/*----------hide field----------*/
function trigger_hide(){
	let hide_fields = ["date_of_birth", "date_of_joining", "gender", "emergency_contact_details","salutation","erpnext_user","joining_details","job-profile","approvers_section","attendance_and_leave_details","salary_information","health_insurance_section","contact_details","sb53","personal_details","educational_qualification","previous_work_experience","history_in_company","exit", "naming_series", "middle_name","employment_details","job_profile"];
	for(let val in hide_fields){
		cur_frm.toggle_display(hide_fields[val], 0);
	}
}

/*------required---------*/
function required_field(){
	let reqd_fields = ["email", "last_name"];
	for(let fld in reqd_fields){
		cur_frm.toggle_reqd(reqd_fields[fld], 1);
	}
}


function uploaded_file_format(frm){
	frm.get_field('resume').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx']
		}
	};

	frm.get_field('w4').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx']
		}
	};

	frm.get_field('e_verify').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx','.jpg','.png']
		}
	};

	frm.get_field('i_9').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx','.jpg','.png']
		}
	};	
	
	frm.get_field('hire_paperwork').df.options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx','.jpg','.png']
		}
	};

	frappe.meta.get_docfield("Employee ID requirements","id_requirements", cur_frm.doc.name).options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx','.jpg','.png']
		}
	};
	
	
	frappe.meta.get_docfield("Employee Direct Deposit letter","direct_deposit_letter", cur_frm.doc.name).options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx','.jpg','.png']
		}
	};

	frappe.meta.get_docfield("Employee Drug Screen","drug_screen", cur_frm.doc.name).options = {
		restrictions: {
			allowed_file_types: ['.pdf','.txt','.docx','.jpg','.png']
		}
	};
}

function cancel_employee(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Employee");
	});
}



function tag_company(frm){
	if(frappe.boot.tag.tag_user_info.company_type=='TAG'){
		frm.set_value('company','');
	}
}

function download_document(frm){
	if(frm.doc.resume && frm.doc.resume.length>1){
        $(".attached-file-link").on("click",function(){
            download_emp_resume(this.innerHTML);
            return false;
        });
	}

	if(frm.doc.w4 && frm.doc.w4.length>1){
		$('[data-fieldname="w4"]').on('click',(e)=> {
			doc_download(e);
		});
	}

	$('[data-fieldname="attachments"]').on('click',(e)=> {
        e.preventDefault();
        if (e.target.target === '_blank') {
            download_emp_resume(e.target.innerHTML);
        }
	});
}

function doc_download(e){
	let file=e.target.innerText;
	let link='';
	if(file.includes('.') && file.length>1){
		if(file.includes('/files/')){
			link=window.location.origin+file;
		}else{
			link=window.location.origin+'/files/'+file;
		}

		let data=file.split('/');
		const anchor = document.createElement('a');
		anchor.href = link;
		anchor.download = data[data.length-1];
		document.body.appendChild(anchor);
		anchor.click();
		document.body.removeChild(anchor);
	}
}

function attachrefresh(){
	setTimeout(()=>{
		document.querySelectorAll('div[data-fieldname="attachments"]').forEach(function(oInput){
			oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1);
		});

		document.querySelectorAll('div[data-fieldname="id_requirements"]').forEach(function(oInput){
			oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1);
		});

		document.querySelectorAll('div[data-fieldname="direct_deposit_letter"]').forEach(function(oInput){
			oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1);
		});

		document.querySelectorAll('div[data-fieldname="drug_screen"]').forEach(function(oInput){
			oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1);
		});
	},200);
}



function companyhide(time){
	setTimeout(() => {
		let txt  = $('[data-fieldname="company"]')[0].getAttribute('aria-owns');
		if(txt != null){
			let txt2 = 'ul[id="'+txt+'"]';
			let  arry = document.querySelectorAll(txt2)[0].children;
			if(arry.length && cur_frm.doc.doctype == "Employee"){
				document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none';
				document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none';
			}
		}
	}, time);
}

function employee_delete_button(frm){
	if (frm.doc.__islocal!=1 && (frappe.user_roles.includes('Staffing Admin') || frappe.user_roles.includes('Staffing User') || frappe.user_roles.includes('Tag Admin'))){
		frm.add_custom_button(__("Delete"),function(){
			delete_employee(frm);
		});
	}
}

function delete_employee(frm){
	return new Promise(function(resolve, reject) {
		frappe.confirm("All the data linked to this employee will be deleted?",
			function() {
				let resp = "frappe.validated = false";
				resolve(resp);
				deleting_data(frm);
			},
			function() {
				reject();
			}
		);
	});
}

function deleting_data(frm){
	frappe.call({
		method:"tag_workflow.utils.employee.delete_data",
		args:{emp:frm.doc.name},
		callback:function(r){
			if(r.message =='Done'){
				frappe.msgprint('Employee Deleted Successfully');
				setTimeout(function () {
					window.location.href='/app/employee'
				}, 2000);
			}
		}
	});
}

function filerestriction(){
	setTimeout(() => {
		document.getElementsByClassName("modal-title")[0].innerHTML='Upload <h6>(Accepted File Type : pdf, txt or docx  file size 10mb) </h6>';
	}, 300);
}

function hide_decrpt_ssn(frm){
	if(frm.doc.__islocal != 1 ){
		frappe.call({
			method: "tag_workflow.tag_data.hide_decrypt_ssn",
			args: {'frm': frm.doc.name,},
			async:0,
			callback: function(r) {
				if (frm.doc.__islocal != 0) {
					frm.set_df_property("decrypt_ssn","hidden",r.message);
					refresh_field('decrypted_ssn');
				}
			}
		});
	}
}

function hide_field(frm){
	frm.set_df_property('city','hidden',frm.doc.city && frm.doc.enter_manually ==1 ? 0:1);
	frm.set_df_property('state','hidden', frm.doc.state && frm.doc.enter_manually ==1 ? 0:1);
	frm.set_df_property('zip','hidden',frm.doc.zip && frm.doc.enter_manually ==1 ? 0:1);
}

function show_fields(frm){
	frm.set_df_property('city','hidden',0);
	frm.set_df_property('state','hidden',0);
	frm.set_df_property('zip','hidden',0);
}

function update_employees_data(frm){
	let roles = frappe.user_roles;
	if (roles.includes("Staffing Admin") || roles.includes("Staffing User") && frm.doc.employee_number) {
		frm.add_custom_button("Sync with JAZZHR", function () {
			cur_frm.is_dirty() == 1 ? frappe.msgprint("Please save the form first") : update_existing_employees(frm);
		}).addClass("btn-primary");
	}
}

function update_existing_employees(frm){
	if(frm.doc.employee_number){
		frappe.call({
			method: "tag_workflow.utils.jazz_integration.update_single_employee",
			args: {"employee_number": frm.doc.employee_number, "company": frm.doc.company},
			freeze: true,
			freeze_message: "<p><b>Updating Employees Record</b></p>",
			callback: function (r) {
				if(r){
					frappe.msgprint('Employees Updation are done in the background . You can continue using the application');
				}
			},
		});
	}else{
		cur_frm.scroll_to_field("jazzhr_api_key");
		frappe.msgprint("<b>JazzHR API Key</b> is required");
	}
}
function show_addr(frm){
	if(frm.doc.search_on_maps){
		frm.get_docfield('street_address').label ='Complete Address';
	}else if(frm.doc.enter_manually){
		frm.get_docfield('street_address').label ='Street Address';
	}

    if(frm.doc.enter_manually == 1){
        cur_frm.toggle_display("complete_address", 0);
    }else{
        cur_frm.toggle_display("complete_address", 1);
    }

	frm.refresh_field('street_address');
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
	if((frm.doc.search_on_maps == 0 && frm.doc.enter_manually ==0)||frm.doc.enter_manually ==1 || frm.is_new()){
		frm.set_df_property('map','hidden',1);
	}
}

/*------------------------------------*/
function get_ssn_value(frm){
	if(frm.doc.ssn){
		frappe.call({method: "tag_workflow.tag_data.api_sec", args: {'frm': frm.doc.name}, callback: function(r) {localStorage.setItem("tag", String(r.message));}});	
		$('[data-fieldname="ssn"]')[1].onfocus = function(){if(localStorage.getItem("tag")){cur_frm.set_value("ssn", localStorage.getItem("tag")); localStorage.setItem("tag", "");}}
	}else{
		localStorage.setItem("tag", "");
	}
}

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


function employee_work_history(frm){
	if(frm.doc.__islocal!=1 && (frappe.boot.tag.tag_user_info.company_type=='Staffing' || frappe.boot.tag.tag_user_info.company_type=='TAG')){
		frm.add_custom_button(__('Employment History'), function(){
			employee_history(frm);
		}).addClass("btn-primary");
	}
}
function employee_history(frm){
	frappe.call({
		'method':'tag_workflow.tag_data.employee_work_history',
		'args':{
			'employee_no':frm.doc.name,
		},
		'callback':function(r){
			if(r.message=='No Record'){
				frappe.msgprint('Employee '+frm.doc.employee_name+' does not have any Work History')
			}
			else{
				let data = r.message;
			let profile_html = `<table class="col-md-12 basic-table table-headers table table-hover"><th>Job Order</th><th>Start Date</th><th>Job Title</th><th>Hiring Company</th><th>Total Hours</th>`;
			for(let p in data){
				profile_html += `<tr>
					<td style="margin-right:20px;" ><a href="${window.location.origin}/app/job-order/${data[p].job_order_detail}">${data[p].job_order_detail}</a></td>
					<td>${data[p].from_date}</td>
					<td>${data[p].job_name}</td>
					<td>${data[p].company}</td>
					<td>${data[p].total_hours.toFixed(2)} ${data[p].workflow_state=="Approval Request" ? "*" : ""} </td>
					</tr>`;
			}
			profile_html+=`</table>`
			let new_pop_up = new frappe.ui.Dialog({
				title: frm.doc.employee_name+" Work History",
				'fields': [
					{fieldname: "staff_companies",fieldtype: "HTML",options:profile_html},
				],
			})
			new_pop_up.$wrapper.find('.modal-dialog').css('max-width', '880px');
			new_pop_up.show();

			}

		}
	})
} 

function append_job_category(frm){
	if(frm.doc.employee_job_category){
		let emp_category = frm.doc.employee_job_category;
		let length = emp_category.length;
		let title = '';	
		for(let i in emp_category){
			if(!emp_category[i].job_category){
				length -= 1
			}
			else if(title == ''){
				title = emp_category[i].job_category
			}
		}

		let job_categories = length > 1 ? title + ' + ' + (length-1) : title
	    frm.set_value("job_categories", job_categories);
	    refresh_field("job_categories");
	
}
	else{
		frm.set_value("job_categories", null);
	    refresh_field("job_categories");
	}
}
function remove_lat_lng(frm){
	if((frm.doc.enter_manually) && (!frm.doc.zip && !frm.doc.city && !frm.doc.state)  && (frm.doc.lat || frm.doc.lng)){
		frm.set_value('complete_address',undefined)
		set_lat_lng_undefined(frm)

	}
	else if((frm.doc.search_on_maps) && (!cur_frm.doc.complete_address) && (frm.doc.lat || frm.doc.lng)){
		frm.set_value('state',undefined)
		frm.set_value('city',undefined)
		frm.set_value('zip',undefined)
		set_lat_lng_undefined(frm)
	}
}
function update_lat_lng(frm){
	if((frm.doc.enter_manually) && (frm.doc.zip && frm.doc.city && frm.doc.state)){
		frappe.call({
			method:"tag_workflow.tag_data.update_lat_lng_required",
			args:{
				'employee_id':frm.doc.name,
				'company':frm.doc.company
			}
		})
	}
}

/*--------------------download---------------------*/
function download_emp_resume(file){
    if(file){
        frappe.call({
			"method": "tag_workflow.utils.bulk_upload_resume.download_resume",
			"args": {"resume": file},
			"freeze": true,
			"freeze_message": "<b>working...</b>",
			"callback": function(r){
				let msg = r.message;
                console.log(msg);
				file = file.split("/");
                let filename = frappe.urllib.get_base_url() + "/files/" + file[file.length-1];
                window.open(filename);
			}
		});
	}
}

/*--------------------Update Complete Address---------------------*/
function update_complete_address(frm){
	if(frm.doc.zip && frm.doc.state && frm.doc.city){
	    let data = {
	        street_number: frm.doc.street_address ? frm.doc.street_address:'',
	        route: frm.doc.suite_or_apartment_no ? frm.doc.suite_or_apartment_no    :'',
	        locality:frm.doc.city,
	        administrative_area_level_1: frm.doc.state,
	        postal_code: frm.doc.zip ? frm.doc.zip:0,
	    };
		update_comp_address(frm,data)
	}
	else{
	    frm.set_value('complete_address','')
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
	                frm.set_value('complete_address',r.message)
	            }
	        }
	        else{
	            frm.set_value('complete_address','')
	        }
	    }
	})
}
	
function set_lat_lng_undefined(frm){
	frm.set_value('suite_or_apartment_no',undefined)
	frm.set_value('street_address',undefined)
	frm.set_value('lat',undefined)
	frm.set_value('lng',undefined)
}

function job_title_filter(frm){
	let job_categories = [];
	if(frm.doc.employee_job_category){
	    frm.doc.employee_job_category.forEach(function(row) {
			job_categories.push(row.job_category)
	    })
	    frm.set_value("job_title_filter",job_categories.join(','));
	    refresh_field("job_title_filter");
	}
}
