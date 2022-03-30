frappe.ui.form.on("Employee", {
	refresh: function(frm){
		$('.form-footer').hide()
		trigger_hide(frm);
		required_field(frm);
		download_document(frm)
		cur_frm.dashboard.hide()
		uploaded_file_format(frm);
		if (frm.doc.__islocal == 1) {
			cancel_employee(frm);
			tag_company(frm);
		  }
		employee_delete_button(frm)
		$('.form-control[data-fieldname="ssn"]').css('-webkit-text-security', 'disc');

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

		window.onclick = function(event) {
			attachrefresh()
		}
		
		$('*[data-fieldname="miscellaneous"]').find('.grid-add-row')[0].addEventListener("click",function(){
				attachrefresh()
		});

		$("[data-fieldname=miscellaneous]").mouseover(function(){
			attachrefresh()
		})

		$('*[data-fieldname="background_check_or_drug_screen"]').find('.grid-add-row')[0].addEventListener("click",function(){
				attachrefresh()
		});

		$("[data-fieldname=background_check_or_drug_screen]").mouseover(function(){
			attachrefresh()
		})

		$('*[data-fieldname="id_requirements"]').find('.grid-add-row')[0].addEventListener("click",function(){
				attachrefresh()
		});

		$("[data-fieldname=id_requirements]").mouseover(function(){
			attachrefresh()
		})

		$('*[data-fieldname="direct_deposit_letter"]').find('.grid-add-row')[0].addEventListener("click",function(){
				attachrefresh()
		});

		$("[data-fieldname=direct_deposit_letter]").mouseover(function(){
			attachrefresh()
		})
		attachrefresh()

		


		$(document).on('click', '[data-fieldtype="Attach"]', function(){
			setTimeout(() => {
				document.getElementsByClassName("modal-title")[0].innerHTML='Upload <h6>(Accepted File Type : pdf, txt or docx ,png ,jpg only, file size 10mb) </h6>'
  			}, 300)
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


		
	},
	decrypt_ssn: function(frm) {
		frappe.call({
			method: "tag_workflow.tag_data.api_sec",
			args: {
				'frm': frm.doc.name,
			},
			callback: function(r) {
				frm.set_value('decrypted_ssn', r.message)
				refresh_field('decrypted_ssn')
			}
		})
	},
	resume:function(frm){
		if (frm.doc.resume && !hasExtensions(frm.doc.resume, [".pdf", ".txt", ".docx",'.png','jpg'])){
			var array = frm.doc.resume.split("/")
			var file_name = array[array.length -1]
			frappe.call({
				method:"tag_workflow.tag_data.delete_file_data",
				args:{
					file_name:file_name
				}
			})
			frm.set_value('resume', '')
			refresh_field('resume');
			frappe.msgprint("Upload Wrong File type in Resume");
		}
	},
	validate:function(frm){

		if (frm.doc.zip &&frm.doc.zip.toString().length != 5){
            frappe.msgprint(__("Minimum and Maximum Characters allowed for Zip are 5"));
            frappe.validated = false;
        }
		
		if (frm.doc.ssn && frm.doc.ssn.toString().length != 9) {
			frappe.msgprint(__("Minimum and Maximum Characters allowed for SSN are 9")); 
		frappe.validated = false;
			
		}
		if (frm.doc.ssn && isNaN(frm.doc.ssn))
		{
			frappe.msgprint(__("Only numbers are allowed in SSN."));
			frappe.validated = false;
		}
		let email = frm.doc.email
		if (email.length > 120 || !frappe.utils.validate_type(email, "email")){
			frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'})
			frappe.validated = false
		}
		if ((frm.doc.employee_job_category) && (frm.doc.employee_job_category.length)>0){
			frm.set_value("job_category",frm.doc.employee_job_category[0]["job_category"])
		}else{
			frm.set_value("job_category",null)
		} 
	},
	before_save:function (frm) {
		
		frm.doc.decrypt_ssn = 0
	},
	
	setup:function(frm){
		frm.set_query("company", function(doc) {
			return {
				"filters":[ ['Company', "organization_type", "in", ["Staffing" ]],['Company',"make_organization_inactive","=",0] ]
			}
		});

	},
	after_save:function(frm){
		if(!frm.doc.user_id){
			frappe.call({
				'method':'tag_workflow.tag_data.update_company_employee',
				'args':{
					'doc_name':frm.doc.name,
					'employee_company':frm.doc.company
				}
			})
		}
		
	}
	
		
});

function hasExtensions(filename, exts){
    return new RegExp("(" + exts.join("|").replace(/\./g, '\\.') + ')$').test(filename);
}

/*----------hide field----------*/
function trigger_hide(frm){
	let hide_fields = ["date_of_birth", "date_of_joining", "gender", "emergency_contact_details","salutation","erpnext_user","joining_details","job-profile","approvers_section","attendance_and_leave_details","salary_information","health_insurance_section","contact_details","sb53","personal_details","educational_qualification","previous_work_experience","history_in_company","exit", "naming_series", "middle_name","employment_details","job_profile"];
	for(var val in hide_fields){
		cur_frm.toggle_display(hide_fields[val], 0);
	}
}

/*------required---------*/
function required_field(frm){
	let reqd_fields = ["email", "last_name"];
	for(var fld in reqd_fields){
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
		frm.set_value('company','')
	}
}

function download_document(frm){
	if(frm.doc.resume && frm.doc.resume.length>1){
		$('[data-fieldname="resume"]').on('click',(e)=> {
			doc_download(e,frm)
		});
	}
	if(frm.doc.w4 && frm.doc.w4.length>1){
		$('[data-fieldname="w4"]').on('click',(e)=> {
			doc_download(e,frm)
		});
	}
	$('[data-fieldname="attachments"]').on('click',(e)=> {
		doc_download(e,frm)
	});
}

function doc_download(e,frm){
	let file=e.target.innerText
	let link=''
  	if(file.includes('.') && file.length>1){
		if(file.includes('/files/')){
			link=window.location.origin+file
		}
		else{
			link=window.location.origin+'/files/'+file
		}			
		let data=file.split('/')
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
				oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1)
		});

		document.querySelectorAll('div[data-fieldname="id_requirements"]').forEach(function(oInput){
				oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1)
		});

		document.querySelectorAll('div[data-fieldname="direct_deposit_letter"]').forEach(function(oInput){
				oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1)
		});

		document.querySelectorAll('div[data-fieldname="drug_screen"]').forEach(function(oInput){
				oInput.children[1].innerText  = oInput.children[1].innerText.split('/').slice(-1)
		});
	},200)
}

function employee_delete_button(frm){
	if (frm.doc.__islocal!=1 && (frappe.user.has_role('Staffing Admin')|| frappe.user_has_role('Staffing User')||frappe.user.has_role('Tag Admin'))){
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


function filerestriction() {
	setTimeout(() => {
				document.getElementsByClassName("modal-title")[0].innerHTML='Upload <h6>(Accepted File Type : pdf, txt or docx  file size 10mb) </h6>'
  	}, 300)
}