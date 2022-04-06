// Copyright (c) 2022, SourceFuse and contributors
// For license information, please see license.txt

frappe.ui.form.on('Claim Order', {
	after_save:function(frm){
		staffing_claim_joborder(frm)
		if (frm.doc.single_share==1){
			claim_order_save(frm)
		}
		
	},
	before_save:function(frm){
		if (!frm.doc.hiring_organization){
			frappe.msgprint(__("Your claim is not completed. Please try again!"));
			frappe.validated = false
			setTimeout(() => {
				frappe.set_route("Form","Job Order", frm.doc.job_order)
			}, 3000);
		}
		frm.set_value('approved_no_of_workers',0)
	},
	validate: function(frm) {
		let no_of_worker = frm.doc.no_of_workers_joborder
		let claim_no = frm.doc.staff_claims_no
		if(claim_no > no_of_worker){
			frappe.msgprint(__("Claims Is Not Greater Than No Of Workers Required"));
            frappe.validated = false;
		}
	},
	staff_claims_no:function(frm){
		let no_of_workers = frm.doc.staff_claims_no
		if (no_of_workers && isNaN(no_of_workers)){
			frappe.msgprint({message: __('Not valid Integer digit'), indicator: 'red'})
			frappe.validated = false
		}

	},
	e_signature:function(frm){
		if(frm.doc.e_signature){
			var regex = /[^0-9A-Za-z ]/g;
			if (regex.test(frm.doc.e_signature) === true){
				frappe.msgprint(__("E signature: Only alphabets and numbers are allowed."));
				frm.set_value('e_signature','')
				frappe.validated = false;
			}
		}

	},
	refresh:function(frm){
		$('.form-footer').hide()
		if(frm.doc.__islocal==1){
			if (!frm.doc.hiring_organization){
                frappe.msgprint(__("Your claim is not completed. Please try again from Job Order!"));
                frappe.validated = false
                setTimeout(() => {
                    frappe.set_route("List","Job Order")
                }, 3000);
			}    
			frm.set_df_property('approved_no_of_workers', "hidden", 1);
			cancel_claimorder(frm);
			submit_claim(frm);
			if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
				setTimeout(()=>{org_info(frm);},500)	
			}
		}
		else{
			let company_field = [
				"job_order","staffing_organization","agree_to_contract","e_signature"
			  ];
			for (let f in company_field) {
				cur_frm.toggle_enable(company_field[f], 0);
			}

		}
		update_claim_by_staffing(frm)

		$(document).on('click', '[data-fieldname="staffing_organization"]', function(){
			companyhide(1250)
		});

		$('[data-fieldname="staffing_organization"]').mouseover(function(){
			companyhide(300)
		})

	  	document.addEventListener("keydown", function(){
	  		companyhide(300)
	    })

	    $('[data-fieldname="staffing_organization"]').click(function(){
			$('[data-doctype="Company"]').removeAttr("href");
			if (frm.doc.staffing_organization){
				frappe.route_options = {"company":frm.doc.staffing_organization };
				frappe.set_route("app", "dynamic_page");
			}
		});


	},
	setup:function(frm){
		$('[data-label="Save"]').hide()
		frm.set_query("staffing_organization", function (doc) {
			return {
			  filters: [
				[
				  "Company",
				  "organization_type",
				  "in",
				  ["Staffing"],
				],
				["Company", "make_organization_inactive", "=", 0],
			  ],
			};
		});
		if(frappe.boot.tag.tag_user_info.company_type == "Staffing"){
			frappe.call({
				'method': "tag_workflow.tag_data.lead_org",
				'args': {'current_user':frappe.session.user},
				'callback':function(r){
					if(r.message=='success'){
						frm.set_value('staffing_organization',frappe.boot.tag.tag_user_info.company)
						frm.refresh_fields();
					}
					else{
						frm.refresh_fields();
					}
				}       
			});
		}
			
	},
	view_contract: function(frm){
		var contracts = "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";

		if (cur_frm.doc.contract_add_on) {
			frappe.db.get_value("Company", {name: cur_frm.doc.company}, ["contract_addendums"], function(r) {
				let contract = new frappe.ui.Dialog({
					title: "Contract Details",
					fields: [{fieldname: "html_37", fieldtype: "HTML", options: contracts + "<li>" + cur_frm.doc.contract_add_on + "</li>  </ol>  </div>",}, ],
				});
				contract.show();
			});
		} else {
			let contract = new frappe.ui.Dialog({
				title: "Contract Details",
				fields: [{fieldname: "html_37", fieldtype: "HTML", options: contracts,},],
			});
			contract.show();
		}
	},
});

function submit_claim(frm){
	frm.add_custom_button(__('Submit Claim'), function(){
		frm.save()
	}).addClass("btn btn-primary btn-sm primary-action");
}

function staffing_claim_joborder(frm){
	frappe.call({
		"method":"tag_workflow.tag_workflow.doctype.claim_order.claim_order.staffing_claim_joborder",
		"freeze": true,
		"freeze_message": "<p><b>preparing notification for Hiring orgs...</b></p>",
		"args":{
			"job_order" :frm.doc.job_order,"hiring_org" : frm.doc.hiring_organization,"staffing_org" : frm.doc.staffing_organization,"doc_name" : frm.doc.name,"single_share":frm.doc.single_share,'no_assigned':frm.doc.staff_claims_no,'no_required':frm.doc.no_of_workers_joborder},
		callback:function(r){
			if (frm.doc.single_share !=1){
				setTimeout(function () {
					window.location.href='/app/job-order/'+frm.doc.job_order
				}, 3000);
			
			}
				
			}
	});
	
}

function cancel_claimorder(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Job Order");
	});
}

function org_info(frm){
	if(frm.doc.__islocal==1 && frm.doc.single_share==1){
		frappe.call({
			'method':"tag_workflow.tag_data.staffing_exclussive_org_name",
			'args':{'job_order':cur_frm.doc.job_order},
			"async": 0,
			callback:function(r){
				if(r.message){
					frm.set_value('staffing_organization',r.message[0]["staff_company"])
					frm.refresh_field("staffing_organization");
				}
			}	
		})
		frm.set_df_property("staffing_organization","read_only",1)
	}else{
		frappe.call({
			'method':"tag_workflow.tag_data.hiring_org_name",
			'args':{'current_user':frappe.session.user},
			callback:function(r){
				if(r.message=='success'){
					frm.set_value('staffing_organization',frappe.boot.tag.tag_user_info.company)
				}
				else{
					frm.set_value('staffing_organization','')
				}
			}	
		})
	}
}



function claim_order_save(frm){
    frappe.call({
        method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.order_details",
        args:{
            'doc_name':frm.doc.job_order
        },
        callback:function(rm){
        	var dict = {}
        	dict[frm.doc.staffing_organization]=frm.doc.staff_claims_no
    		frappe.call({
                method:"tag_workflow.tag_workflow.doctype.claim_order.claim_order.save_claims",
                args:{
                    'my_data':dict,
                    'doc_name':frm.doc.job_order
                },
                callback:function(rmdata){  
                    setTimeout(function () {
                        window.location.href='/app/job-order/'+frm.doc.job_order
                    }, 3000);
                        frappe.msgprint('Notification send successfully')	
                }
            })
        }
    })
}
                                
function update_claim_by_staffing(frm){
	if(cur_frm.doc.__islocal != 1){
	frappe.db.get_value('User',{'name':frm.doc.modified_by},['organization_type'],function(r){
		console.log(r)
		if(r.organization_type !='Staffing' || r  == null){
			console.log(r)
			frm.set_df_property('staff_claims_no', 'read_only', 1)
			// $('[data-label="Save"]').hide()
		}
		else{
			submit_claim(frm)
		}			
}) 
	} 
}         

function companyhide(time) {
	setTimeout(() => {
		var txt  = $('[data-fieldname="staffing_organization"]')[1].getAttribute('aria-owns')
		var txt2 = 'ul[id="'+txt+'"]'
		var  arry = document.querySelectorAll(txt2)[0].children
		document.querySelectorAll(txt2)[0].children[arry.length-2].style.display='none'
		document.querySelectorAll(txt2)[0].children[arry.length-1].style.display='none'

		
	}, time)
}
