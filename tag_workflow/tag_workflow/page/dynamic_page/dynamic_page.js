let company=localStorage.getItem("company")

frappe.pages['dynamic_page'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: 'Company',
		single_column: true
	});
	wrapper.face_recognition = new frappe.FaceRecognition(wrapper, page);
}

frappe.FaceRecognition = Class.extend({
	init: function(wrapper, page) {
		var me = this;
		this.parent = wrapper;
		this.page = this.parent.page;
		setTimeout(function() {
			me.setup(wrapper, page);
		}, 100);
	},

	setup: function(wrapper, page){
		page.set_secondary_action('', () => me.get_details(wrapper, page), 'refresh');
		var me = this;
		this.body = $('<div></div>').appendTo(this.page.main);
		$(frappe.render_template('dynamic_page', "")).appendTo(this.body);
		me.show_profile(wrapper,page);
	},

	show_profile: function(_wrapper, _page){
		frappe.call({
			method: "tag_workflow.tag_workflow.page.dynamic_page.dynamic_page.get_link1",
			args: { "name": company || '',
					"userid": frappe.user_info().email
					},
			callback: function (r) {			
				setTimeout(hide,10);
				function hide(){
					if(frappe.boot.tag.tag_user_info.company_type=== "Staffing"){
						$("#place_order").hide();
					}
					if(frappe.boot.tag.tag_user_info.company_type===r.message[0].organization_type){
						$("#place_order").hide();
						$("#work_order").hide();
					}
					if(r.message[0].organization_type!= 'Staffing'){
						$("#coi").hide();
						$("#safety_manual").hide();
					}
				}

				var my_val= r.message[0];
				var txt = "";
				var text = r.message[2];
				for(let i in text){
					txt += text[i].full_name + "<br>";
				}

				var industry = "";
				for(var j in my_val.industry_type){
					industry += my_val.industry_type[j].industry_type + "<br>";
				}

				var count = 0;
				var rate = "";
				for(let k in r.message[1]){
					count += 1;
					rate+= '★'.repeat(r.message[1][k][0]) + "<br>"  + r.message[1][k][1] + "<br>"+ r.message[1][k][2] +"<br>"+ "<br>";
				}

				let arr1= add_ress(my_val)
				var varr= arr1.join(", ");
				let link_coi='';
				let link_sm='';
				if(r.message[0].cert_of_insurance || r.message[0].safety_manual){
					link_coi = r.message[0].cert_of_insurance.split(' ').join('%');
					link_sm= r.message[0].safety_manual.split(' ').join('%');
				}
				let template = `
					<div class="container form-section m-auto card-section visible-section" style="max-width: 97%;width: 100%;padding: 0;animation: animatop 1.7s cubic-bezier(0.425, 1.14, 0.47, 1.125) forwards;background: transparent;"> 
					<div id="listdata">
					 <div class="user_list border rounded pt-4">
						<div class="w-100 px-3 d-flex flex-wrap">
							<div class="col-md-6 col-sm-12 company_list">
								<h5 class="col-md-4 px-0" id="comp_name">${my_val.name}</h5> 
								<div id="jobsite">
									<div id="address"> ${varr}</div>
								</div>
								<p class="my-3 rating"> <span class="text-warning"> ★ </span> <span> ${my_val.average_rating||0} </span> <span> <a href="#">  <u> ${count} Reviews </u> </a> </span> </p>
							</div>
							<div class="col-md-6 col-sm-12 order text-left text-md-right ">
                                <div>
                                    <a href=javascript:new_order() class="text-decoration-none">
                                        <button type="button" id="place_order" class="btn btn-primary btn-xs mb-1 mt-1 mr-2 ">Place Order</button>
                                    </a>
                                    <a href=javascript:work_order_history()>
                                        <button type="button" id="work_order"  class="btn btn-primary  mb-1 btn-xs mt-1">Work Order History</button>
                                    </a>
                                </div>
                                <div> 
                                    <a href=javascript:document_download("${link_coi}")>
                                        <button type="button" id="coi" class="attached-file-link btn btn-primary mr-2 btn-xs mt-2" style="padding:5px 19.5px;"> 
                                            COI 
                                            <i class="fa fa-download mx-2" aria-hidden="true"></i>
                                        </button></a>
                                    <a href=javascript:document_download("${link_sm}")>
                                        <button type="button" id="safety_manual" class="btn btn-primary btn-xs mt-2 attached-file-link">
                                            Safety Manual
                                            <i class="fa fa-download mx-2" aria-hidden="true"></i>
                                        </button>
                                    </a>
                                </div>
                            </div>
						</div>
								   
						<div class="accordion mt-4 custom_collapse" id="accordionExample">
						
							<div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse" aria-expanded="false" aria-controls="collapse">
										About &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse">
										${my_val.about_organization}   
									</div>
								</div>
							</div>

							<div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse1" aria-expanded="false" aria-controls="collapse">
										Industries &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse1">
										<div id="industry"> 
										${industry}
										</div>
								</div>
								</div>
							</div>

							<div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse2" aria-expanded="false" aria-controls="collapse">
										Team Members &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse2">
										<div id="employee"> 
										${txt}
										</div>
									</div>
								</div>
							</div>

							 <div class="card">
								<div class="card-body">
									<div class="card-header">
										<button class="card-title btn-block text-left " data-toggle="collapse" data-target="#collapse3" aria-expanded="false" aria-controls="collapse">
										Ratings & Reviews &nbsp; <span class="rotate-icon "> &#x2304; </span>
										</button>
									</div>
									<div class="card-text collapse pb-2 show" id="collapse3">
										<div id="employee"> 
										${rate} 
										</div>
									</div>
								</div>
							</div>
							
						</div>
					</div>`;
				$("#dynamic_company_data1").html(template);
			
		}
		});
		
	},
});

function new_order(){
	var b = document.getElementById('comp_name').innerHTML;
	var doc = frappe.model.get_new_doc("Job Order");
	doc.company = frappe.boot.tag.tag_user_info.company;
	doc.staff_company = b;
	doc.posting_date_time = frappe.datetime.now_date();
	frappe.set_route("Form", doc.doctype, doc.name);
}	

function work_order_history(){
	frappe.call({
		method: "tag_workflow.tag_workflow.page.dynamic_page.dynamic_page.get_link2",
		args: { "name": company || '',
				"comp": frappe.boot.tag.tag_user_info.company,
				"comp_type" :frappe.boot.tag.tag_user_info.company_type,
				"user_id": frappe.user_info().email
				
		},
		callback: function (r) {
			let body;
			let title1;
			if(r.message[1]==="exceed"){ 
				let opt=``;
				title1= "Select Your Company"
				for(let companies in r.message[0]){
					let link = r.message[0][companies].company.split(' ').join('%@');
					opt+=`<a href=javascript:work_order_history_for_multi_companies("${link}")><button type="button" class="btn btn-primary btn-sm mt-1" style="margin-right:10px">${r.message[0][companies].company}</button></a>`				}
				body= opt;
				let fields = [{"fieldname": "", "fieldtype": "HTML", "options": body}];
				let dialog = new frappe.ui.Dialog({title: title1,	fields: fields});
				dialog.show();
				dialog.$wrapper.find('.modal-dialog').css('max-width', '680px');

				
			}
			else{
					my_pop_up(r.message)
			}
						
		}
	});
}


function work_order_history_for_multi_companies(name2){
	var name3= name2.replace(/%@/g, ' ');
	frappe.call({
		method: "tag_workflow.tag_workflow.page.dynamic_page.dynamic_page.get_link3",
		args: { "name": company || '',
				"comp": name3,
				"comp_type" :frappe.boot.tag.tag_user_info.company_type
		},
		callback: function (r) {
			my_pop_up(r.message)		
		}
	});
}
function my_pop_up(message){
	var job_order=""
	var created= ""
	var job_category=""
	var rate1=""
	var total=""
	let title1= "Work Order History"
	for(let l in message[0]){
		var jobb= message[0][l].name
		for(let s in message[2]){
			var invoice= message[2][s][1];
			if(invoice==jobb){
				total+=invoice+ "<br>"+ "<br>"
			}
			
		}


		job_order+= message[0][l].name+ "<br>"+ "<br>";
	}

	for(let m in message[0]){
		var from_date= message[0][m].from_date+ "<br>"+ "<br>";
		
		created+=(from_date)
	}

	for(let n in message[1]){
		var job_cat= message[1][n].job_category+ "<br>"+ "<br>";
		
		job_category+=(job_cat)
	}

	for(let p in message[0]){
		var rate= message[0][p].rate+ "<br>"+ "<br>";
		
		rate1+=(rate)
	}

	let head = `<table class="col-md-12 basic-table table-headers table table-hover"><thead><tr><th>Job Order</th><th>Start Date</th><th>Job Title</th><th>Rate</th><th>Invoiced Amout</th><th></th></tr></thead><tbody>`;
	let html = ``;
	html=html_data(html,message)
	let body;
	if(html){
		body = head + html + "</tbody></table>";
	}else{
		body = head + `<tr><td></td><td></td><td>No Data Found</td><td></td><td></td><td></td></tbody></table>`;
	}

	let fields = [{"fieldname": "", "fieldtype": "HTML", "options": body}];
	let dialog = new frappe.ui.Dialog({title: title1,	fields: fields});
	dialog.show();
	dialog.$wrapper.find('.modal-dialog').css('max-width', '980px');

}
function html_data(html,message){
	for(let d in message[0]){
		if(message[2][d].total_billing_amount==null){
			message[2][d].total_billing_amount=(0).toFixed(2)
		}
		else{
			message[2][d].total_billing_amount=message[2][d].total_billing_amount.toFixed(2)
		}		
		html += `<tr><td>${message[0][d].name}</td><td>${message[0][d].from_date}</td><td>${message[1][d].job_category}</td><td>$ ${message[0][d].rate}</td><td>$ ${message[2][d].total_billing_amount}${message[0][d].order_status != "Completed" ? "*" : ""}</td><td><button class="btn btn-primary btn-sm primary-action" data-label="Order Details" onclick="frappe.set_route('form', 'Job Order', '${message[0][d].name}')">Order <span class="alt-underline">Det</span>ails</button></td></tr>`;
		
	}
	return html
}

function document_download(file1){
	let file2=file1.replace(/%/g, ' ');
	let file=''
	if(file2.includes('/private')){
		file = file2.replace('/private/','/');
	}
	else{
		file=file2
	}
	if(file=="" || undefined){
		frappe.msgprint("No File Attached");
	}
	let link=''
	if(file.includes('.')){
		if(file.length>1){
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
}

function add_ress(my_val){
	var arr = [];
		if(my_val.suite_or_apartment_no){
			arr.push(my_val.suite_or_apartment_no);
		}

		if(my_val.address){
			arr.push(my_val.address);
		}

		if(my_val.city){
			arr.push(my_val.city);
		}

		if(my_val.state){
			arr.push(my_val.state);
		}

		if(my_val.zip){
			arr.push(my_val.zip);
		}
	return arr;	
}
