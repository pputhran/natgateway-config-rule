const CONFIG = require('aws-sdk/clients/configservice');
const config = new CONFIG()

const EC2 = require('aws-sdk/clients/ec2');
const ec2 = new EC2();

const COMPLIANCE_STATES = {
    COMPLIANT: 'COMPLIANT',
    NON_COMPLIANT: 'NON_COMPLIANT',
    NOT_APPLICABLE: 'NOT_APPLICABLE'
};

async function evaluation(event, objectArray) {
    objectArray.forEach(async ([key, value]) => {
        console.log(`key - ${key}`)
        let putEvaluationsRequest
        if (value == 1) {
            putEvaluationsRequest = {
                Evaluations: [{
                    // Applies the evaluation result to the AWS account published in the event.
                    ComplianceResourceType: 'AWS::EC2::NatGateway',
                    ComplianceResourceId: key,
                    ComplianceType: COMPLIANCE_STATES.NON_COMPLIANT, //evaluateCompliance(ruleParameters.maxCount, count),
                    OrderingTimestamp: new Date(),
                    Annotation: "Noncompliant - Single NAT Gateway resource in your VPC"
                }],
                ResultToken: event.resultToken
            };

            console.log(putEvaluationsRequest)

            const configResponse = await config.putEvaluations(putEvaluationsRequest).promise();
        }
        else {
            console.log(`key - ${key}`)
            putEvaluationsRequest = {
                Evaluations: [{
                    // Applies the evaluation result to the AWS account published in the event.
                    ComplianceResourceType: 'AWS::EC2::NatGateway',
                    ComplianceResourceId: key,
                    ComplianceType: COMPLIANCE_STATES.COMPLIANT, //evaluateCompliance(ruleParameters.maxCount, count),
                    OrderingTimestamp: new Date(),
                    Annotation: "Compliant"
                }],
                ResultToken: event.resultToken
            };

            console.log(putEvaluationsRequest)

            const configResponse = await config.putEvaluations(putEvaluationsRequest).promise();

        }

    });
}

exports.handler = async (event) => {
    console.log(`event - ${JSON.stringify(event)}`)

    // runs describe-nat-gateways and if there is only one NAT Gateway in a VPC, it will mark that VPC as non-compliant

    const ec2Response = await ec2.describeNatGateways().promise();
    console.log(`ec2Response - ${JSON.stringify(ec2Response.NatGateways)}`)

    const nat = ec2Response.NatGateways;
    let NAT_ID

    if (nat.length > 0) {

        const groupByNatG = nat.filter(({State}) => State === 'available').reduce((acc, it) => {            
                console.log(`${it.VpcId} - ${it.State}`)
                acc[it.VpcId] = acc[it.VpcId] + 1 || 1;
                return acc;
        }, {});

        console.log(groupByNatG)

        const objectArray = Object.entries(groupByNatG);

        await evaluation(event, objectArray)

    }
    else {
        console.log(`There are no NAT Gateways in this region`);
    }

};
