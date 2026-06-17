using MQTTnet;
using System.Data;
using System.Text;
using System.Text.Json;
using System.Globalization;

var factory = new MqttClientFactory();

var mqttClient = factory.CreateMqttClient();

var options = new MqttClientOptionsBuilder()
    .WithTcpServer("broker.hivemq.com", 1883)
    .Build();

Console.WriteLine("Conectando...");

await mqttClient.ConnectAsync(options);

Console.WriteLine("Conectado!");

var random = new Random();

while(true)
{
    var temperatura = Math.Round(20 + random.NextDouble() * 30, 2);
    var umidade = Math.Round(40 + random.NextDouble() * 50, 2);
    var vibracao = Math.Round(random.NextDouble() * 6, 2);
    var status = true;

    var payloadTemperatura = temperatura.ToString(CultureInfo.InvariantCulture);
    var payloadUmidade = umidade.ToString(CultureInfo.InvariantCulture);
    var payloadVibracao = vibracao.ToString(CultureInfo.InvariantCulture);
    var payloadStatus = status.ToString().ToLower();

    var mensagemTemperatura = new MqttApplicationMessageBuilder()
    .WithTopic("industria/temperatura")
    .WithPayload(Encoding.UTF8.GetBytes(payloadTemperatura))
    .Build();
    await mqttClient.PublishAsync(mensagemTemperatura);
    Console.WriteLine($"Temperatura: {payloadTemperatura}°C");

    var mensagemUmidade = new MqttApplicationMessageBuilder()
    .WithTopic("industria/umidade")
    .WithPayload(Encoding.UTF8.GetBytes(payloadUmidade))
    .Build();
    await mqttClient.PublishAsync(mensagemUmidade);
    Console.WriteLine($"Umidade: {payloadUmidade}%");

    var mensagemVibracao = new MqttApplicationMessageBuilder()
    .WithTopic("industria/vibracao")
    .WithPayload(Encoding.UTF8.GetBytes(payloadVibracao))
    .Build();
    await mqttClient.PublishAsync(mensagemVibracao);
    Console.WriteLine($"Vibração: {payloadVibracao}");

    var mensagemStatus = new MqttApplicationMessageBuilder()
    .WithTopic("industria/status")
    .WithPayload(Encoding.UTF8.GetBytes(payloadStatus))
    .Build();
    await mqttClient.PublishAsync(mensagemStatus);
    Console.WriteLine($"Status: {payloadStatus}");


    await Task.Delay(2000);
}
