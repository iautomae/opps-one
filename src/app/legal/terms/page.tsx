import React from 'react';

export default function TermsPage() {
    return (
        <div className="space-y-12">
            <header className="space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-outfit">
                    Términos y <span className="text-brand-turquoise">Condiciones</span>
                </h1>
                <p className="text-slate-400 text-lg leading-relaxed">
                    Marco legal y operativo para el uso de la infraestructura digital de Opps One.
                </p>
            </header>

            <div className="prose prose-invert max-w-none space-y-12 text-slate-300 leading-relaxed font-light">
                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">01.</span> Objeto del Servicio y Aceptación
                    </h2>
                    <p>
                        El presente documento establece los términos contractuales que rigen el acceso y uso de la plataforma SaaS y los servicios de consultoría tecnológica proporcionados por Opps One. Al utilizar nuestras herramientas de automatización y agentes de IA, el cliente acepta sin reservas todas las disposiciones aquí contenidas. Este acuerdo constituye el contrato integral entre las partes para el despliegue de soluciones inteligentes en el mercado peruano e internacional.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">02.</span> Propiedad Intelectual e Industrial
                    </h2>
                    <p>
                        Opps One conserva la titularidad exclusiva de todo el software, código fuente, algoritmos, metodologías de entrenamiento de IA y diseños de interfaz. El cliente recibe una licencia de uso limitada, no exclusiva y revocable para operar las herramientas contratadas. Queda estrictamente prohibida la ingeniería inversa, descompilación o cualquier intento de extraer la lógica propietaria de nuestros modelos de automatización para fines ajenos a los autorizados en el contrato de servicio.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">03.</span> Responsabilidad en el Output de la IA
                    </h2>
                    <p>
                        Nuestras soluciones utilizan modelos probabilísticos de Inteligencia Artificial para generar respuestas, documentos y flujos de trabajo. Si bien aplicamos filtros de calidad rigurosos, el cliente reconoce que el &quot;output&quot; de la IA puede contener imprecisiones. Es responsabilidad final del usuario profesional supervisar, validar y aprobar cualquier acción crítica o documento legal/financiero generado por el sistema antes de su ejecución o distribución a terceros.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">04.</span> Disponibilidad y Acuerdo de Nivel de Servicio (SLA)
                    </h2>
                    <p>
                        Nos esforzamos por mantener una disponibilidad del servicio del 99.9% anual. Opps One no se responsabiliza por interrupciones debidas a fallos en proveedores de infraestructura de nube globales, proveedores de modelos de lenguaje externos o mantenimientos programados debidamente notificados. En caso de incidencias críticas, nuestro equipo técnico activará protocolos de recuperación inmediata según los tiempos de respuesta estipulados en su plan corporativo.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">05.</span> Uso Ético y Conducta Prohibida
                    </h2>
                    <p>
                        El cliente se compromete a no utilizar las capacidades de automatización de Opps One para actividades ilícitas, generación de spam masivo, suplantación de identidad o creación de contenido que vulnere derechos fundamentales. El uso de nuestros agentes inteligentes debe alinearse con las políticas de seguridad de la información y ética digital. El incumplimiento de esta cláusula facultará a Opps One para la suspensión inmediata del servicio sin derecho a reembolso.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">06.</span> Suscripciones, Pagos y Facturación
                    </h2>
                    <p>
                        Los servicios se facturan bajo modalidad de suscripción recurrente o pago por uso, según el plan seleccionado. Todas las tarifas están sujetas a los impuestos de ley vigentes en Perú. En caso de mora superior a los 15 días calendario, Opps One se reserva el derecho de suspender el acceso a la plataforma y a la API de automatización hasta la regularización de los pagos pendientes, sin perjuicio de las penalidades kontraktuales que correspondan.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">07.</span> Confidencialidad Corporativa
                    </h2>
                    <p>
                        Ambas partes se obligan a guardar estricto secreto sobre la información confidencial a la que tengan acceso durante la vigencia del servicio. Para el caso de Opps One, esto incluye los datos operativos y secretos comerciales del cliente; para el caso del cliente, esto incluye las tarifas especiales, documentación técnica interna y metodologías de implementación de IA de nuestra empresa. Esta obligación subsistirá aún después de finalizada la relación contractual.
                    </p>
                </section>

                <section className="space-y-4">
                    <h2 className="text-xl font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                        <span className="text-brand-turquoise">08.</span> Jurisdicción y Resolución de Conflictos
                    </h2>
                    <p>
                        Cualquier discrepancia derivada de la interpretación o ejecución de estos términos será resuelta preferentemente de buena fe mediante negociación directa. De no llegarse a un acuerdo, las partes se someten irrevocablemente a la jurisdicción de los Jueces y Tribunales del Cercado de Lima, Perú, renunciando a cualquier otro fuero que pudiera corresponderles por razón de sus domicilios presentes o futuros.
                    </p>
                </section>

                <div className="pt-10 border-t border-white/5">
                    <p className="text-xs text-slate-500 italic">
                        Opps One - Potenciando la eficiencia industrial con algoritmos de vanguardia.
                    </p>
                </div>
            </div>
        </div>
    );
}
